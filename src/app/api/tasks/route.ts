// app/api/tasks/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { SHARE_AFFILIATE_LINK_TASK_NAME, TASK_DAILY_RESET_TIME } from '@/utils/consts';

const AVAILABLE_IMAGES = ['youtube', 'telegram', 'twitter', 'friends'];

async function getPartnerImage(imageName: string): Promise<string | null> {
  try {
    const partner = await prisma.partner.findFirst({
      where: {
        name: {
          contains: imageName,
          mode: 'insensitive'
        },
        isActive: true
      }
    });

    return partner ? partner.image : null;
  } catch (error) {
    console.error('Error fetching partner data:', error);
    return null;
  }
}

async function processTaskData(task: any, userTask: any | null, resetTime: Date, currentTime: Date) {
  let isCompleted = userTask?.isCompleted || false;
  let completedAt = userTask?.completedAt || null;
  let taskStartTimestamp = userTask?.taskStartTimestamp || null;

  // Handle daily task reset logic
  if (task.type === 'DAILY' && userTask) {
    let shouldReset = false;

    // Check if task was completed before today's reset time
    if (userTask.completedAt && new Date(userTask.completedAt) < resetTime) {
      shouldReset = true;
    }
    // Check if task was started before today's reset time (regardless of completion status)
    else if (userTask.taskStartTimestamp && new Date(userTask.taskStartTimestamp) < resetTime) {
      shouldReset = true;
    }

    if (shouldReset) {
      isCompleted = false;
      completedAt = null;
      taskStartTimestamp = null;
    }
  }

  // Process image
  let taskImage = task.image;
  if (!AVAILABLE_IMAGES.includes(task.image)) {
    const partnerImage = await getPartnerImage(task.image);
    if (partnerImage) {
      taskImage = partnerImage;
    }
  }

  return {
    ...task,
    partnerImage: taskImage,
    taskStartTimestamp,
    isCompleted,
    completedAt,
    metadata: userTask?.metadata
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const telegramInitData = url.searchParams.get('initData');

  if (!telegramInitData) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  try {
    // Fetch the user
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch tasks and taskActions separately to avoid $lookup
    const [activeTasks, taskActions] = await Promise.all([
      prisma.task.findMany({
        where: { isActive: true, isDeleted: false }
      }),
      prisma.taskAction.findMany()
    ]);

    // Create a map for efficient taskAction lookup
    const taskActionMap = new Map(taskActions.map((ta) => [ta.id, ta]));

    // Add taskAction to each task using in-memory join
    const tasksWithActions = activeTasks.map((task) => ({
      ...task,
      taskAction: taskActionMap.get(task.taskActionId)
    }));

    // Fetch UserTask entries without task include to avoid $lookup
    const validUserTasks = await prisma.userTask.findMany({
      where: {
        userId: user.id,
        taskId: { in: activeTasks.map((t) => t.id) } // Only get UserTasks for active tasks
      }
    });

    // Add task data to each userTask using in-memory join
    const userTasksWithTaskData = validUserTasks.map((userTask) => {
      const task = activeTasks.find((t) => t.id === userTask.taskId);
      return {
        ...userTask,
        task: task
          ? {
              ...task,
              taskAction: taskActionMap.get(task.taskActionId)
            }
          : null
      };
    });

    // Get current date and reset time
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);

    // If current time is before reset time, set reset time to previous day
    if (now < resetTime) {
      resetTime.setDate(resetTime.getDate() - 1);
    }

    // Process active tasks
    const tasksData = await Promise.all(
      tasksWithActions.map(async (task) => {
        let userTask = null;

        // For non-daily tasks or non-affiliate tasks, find the most recent user task
        if (task.type !== 'DAILY' || task.title !== SHARE_AFFILIATE_LINK_TASK_NAME) {
          userTask = userTasksWithTaskData.filter((ut) => ut.taskId === task.id).findLast(() => true);
        } else {
          // For DAILY "Share affiliate link" tasks, find the most recent UserTask
          const relevantUserTask = userTasksWithTaskData
            .filter((ut) => ut.taskId === task.id)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

          userTask = relevantUserTask || null;
        }

        return processTaskData(task, userTask, resetTime, now);
      })
    );

    // Process completed tasks
    const completedTasks = await Promise.all(
      userTasksWithTaskData
        .filter((ut) => {
          if (ut.isCompleted) {
            if (ut.task && ut.task.type === 'DAILY' && ut.completedAt && ut.isCompleted) {
              const completionDate = new Date(ut.completedAt);
              return completionDate >= resetTime;
            }
            return true;
          }
        })
        .map(async (ut) => {
          const processedTask = await processTaskData(ut.task, ut, resetTime, now);
          return {
            ...ut,
            title: processedTask.title,
            description: processedTask.description,
            points: processedTask.points,
            type: processedTask.type,
            image: processedTask.image,
            partnerImage: processedTask.partnerImage,
            callToAction: processedTask.callToAction,
            taskData: processedTask.taskData,
            isActive: processedTask.isActive,
            taskActionId: processedTask.taskActionId
          };
        })
    );

    return NextResponse.json({
      tasks: tasksData,
      completedTasks
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch user tasks' }, { status: 500 });
  }
}
