// app/api/tasks/update/story/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';

interface UpdateStoryTaskRequestBody {
  initData: string;
  taskId: string;
}

export async function POST(req: Request) {
  const requestBody: UpdateStoryTaskRequestBody = await req.json();
  const { initData: telegramInitData, taskId } = requestBody;

  if (!telegramInitData || !taskId) {
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
    const result = await prisma.$transaction(async (prisma) => {
      // Find the user
      const dbUser = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!dbUser) {
        throw new Error('User not found');
      }

      // Find the task
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { taskAction: true }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Check if the task is active
      if (!task.isActive) {
        throw new Error('This task is no longer active');
      }

      // Verify this is a STORY type task
      if (task.taskAction.name !== 'STORY') {
        throw new Error('Invalid task action for this operation');
      }

      // Check if the task is DAILY
      if (task.type === 'DAILY') {
        // Get the current date and time in UTC
        const now = new Date();
        
        // Calculate the current reset window
        let startOfCurrentWindow: Date;
        let endOfCurrentWindow: Date;
        
        const todayResetTime = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TASK_DAILY_RESET_TIME, 0, 0)
        );
        
        if (now >= todayResetTime) {
          // Current time is after today's reset time, so current window is today's reset to tomorrow's reset
          startOfCurrentWindow = todayResetTime;
          endOfCurrentWindow = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, TASK_DAILY_RESET_TIME, 0, 0)
          );
        } else {
          // Current time is before today's reset time, so current window is yesterday's reset to today's reset
          startOfCurrentWindow = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, TASK_DAILY_RESET_TIME, 0, 0)
          );
          endOfCurrentWindow = todayResetTime;
        }

        // Check if a daily task has already been created for the current reset window
        const userTaskToday = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            taskStartTimestamp: {
              gte: startOfCurrentWindow, // After current window start
              lt: endOfCurrentWindow // Before current window end
            }
          }
        });

        if (userTaskToday) {
          // If the task is already completed in the current window, user needs to wait for next reset
          if (userTaskToday.isCompleted) {
            throw new Error('Daily story task already completed in the current reset window');
          }
          
          return {
            success: true,
            message: 'Daily story task already started in the current reset window',
            taskStartTimestamp: userTaskToday.taskStartTimestamp
          };
        }

        // Create a new UserTask entry for daily task
        const userTask = await prisma.userTask.create({
          data: {
            userId: dbUser.id,
            taskId: task.id,
            taskStartTimestamp: new Date(),
            isCompleted: false
          }
        });

        return {
          success: true,
          message: 'Daily story task started successfully',
          taskStartTimestamp: userTask.taskStartTimestamp
        };
      }

      // For regular STORY tasks, check if the user has already started this task
      const existingUserTask = await prisma.userTask.findFirst({
        where: {
          userId: dbUser.id,
          taskId: task.id
        }
      });

      if (existingUserTask) {
        // If the task is already completed, don't allow starting again
        if (existingUserTask.isCompleted) {
          throw new Error('Story task already completed');
        }
        
        return {
          success: true,
          message: 'Story task already started',
          taskStartTimestamp: existingUserTask.taskStartTimestamp
        };
      }

      // Create a new UserTask entry for STORY task
      const userTask = await prisma.userTask.create({
        data: {
          userId: dbUser.id,
          taskId: task.id,
          taskStartTimestamp: new Date(),
          isCompleted: false
        }
      });

      return {
        success: true,
        message: 'Story task started successfully',
        taskStartTimestamp: userTask.taskStartTimestamp
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error starting story task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start story task' },
      { status: 500 }
    );
  }
} 