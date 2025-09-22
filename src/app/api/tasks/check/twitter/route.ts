// app/api/tasks/check/twitter/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { calculateYieldPerHour } from '@/utils/calculations';
import { checkUserFollowsTwitterChannel, getTweetData, twitterHandleExists } from '@/utils/twitter';
import { TransactionStatus, TransactionType } from '@prisma/client';

interface CheckTelegramTaskRequestBody {
  initData: string;
  taskId: string;
  submissionUrl: string;
}

export async function POST(req: Request) {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: 'Telegram bot token is missing' }, { status: 500 });
  }

  const requestBody: CheckTelegramTaskRequestBody = await req.json();
  const { initData: telegramInitData, taskId, submissionUrl = null } = requestBody;

  let postURL = submissionUrl?.split('?')[0] || null;

  if (!telegramInitData || !taskId) {
    return NextResponse.json({ error: 'Invalid request: missing initData or taskId' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data: missing telegramId' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (prisma) => {
      // Find the user
      const dbUser = await prisma.user.findUnique({
        where: { telegramId },
        select: {
          id: true,
          twitterHandle: true,
          twitterId: true,
          yieldPerHour: true,
          bonusYieldPerHour: true
        }
      });

      if (!dbUser) {
        throw new Error('User not found in database');
      }

      if (!dbUser.twitterHandle) {
        throw new Error('Please connect your Twitter account first');
      }

      // Find the task
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { taskAction: true }
      });

      if (!task) {
        throw new Error('Task not found in database');
      }

      // Check if the task is active
      if (!task.isActive) {
        throw new Error('This task is no longer active');
      }

      // Check if the task is of action TWITTER
      if (task.taskAction.name !== 'TWITTER' || !task.taskData) {
        throw new Error('Invalid task action or missing task data for this operation');
      }

      // Check for daily reset
      const now = new Date();
      const resetTime = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TASK_DAILY_RESET_TIME, 0, 0)
      );

      let userTask;
      // For daily tasks, check completion status
      if (task.type === 'DAILY') {
        // Check if task was already completed today
        const existingTaskToday = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            completedAt: {
              gte: resetTime,
              lt: new Date(resetTime.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        });

        if (existingTaskToday) {
          return {
            success: false,
            message: 'Daily task already completed for today.',
            completedAt: existingTaskToday.completedAt
          };
        } else {
          // If no task exists for today, create new one
          userTask = await prisma.userTask.create({
            data: {
              userId: dbUser.id,
              taskId: task.id,
              isCompleted: false,
              submissionUrl: postURL || undefined
            }
          });
        }
      } else {
        // For non-daily tasks, find any existing task
        const existingUserTask = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id
          }
        });

        // Check if already completed
        if (existingUserTask?.isCompleted) {
          throw new Error('Task already completed');
        }

        userTask =
          existingUserTask ||
          (await prisma.userTask.create({
            data: {
              userId: dbUser.id,
              taskId: task.id,
              isCompleted: false,
              submissionUrl: postURL || undefined
            }
          }));
      }

      // Validate Twitter-specific requirements
      const taskData = task.taskData as any;
      const channelUsername = taskData.chatId;
      const requireSubmission = taskData.requireSubmission;

      if (requireSubmission) {
        await validateSubmission(postURL, channelUsername, dbUser.twitterId);
      } else {
        await validateFollowership(channelUsername, dbUser.twitterHandle);
      }

      // Calculate points with proper rounding
      const basePoints = task.points || 0;
      const multiplier = task.multiplier || (task.type === 'DAILY' ? 2 : 1.5);
      const yieldRate = calculateYieldPerHour(dbUser.bonusYieldPerHour || 0, dbUser.yieldPerHour || 0);
      const points = Math.round(basePoints + yieldRate * multiplier);

      // Update the task as completed
      userTask = await prisma.userTask.update({
        where: {
          id: userTask.id
        },
        data: {
          isCompleted: true,
          completedAt: now,
          submissionUrl: postURL || undefined
        }
      });

      const updatedUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          points: { increment: points },
          pointsBalance: { increment: points },
          totalStars: { increment: task.rewardStars || 0 },
          earnedStars: { increment: task.rewardStars || 0 }
        }
      });

      await prisma.transaction.create({
        data: {
          userId: dbUser.id,
          sourceId: userTask.id,
          amount: task.rewardStars || 0,
          type: TransactionType.EARNED,
          status: TransactionStatus.COMPLETED,
          description: `Twitter Task: ${task.rewardStars} stars`
        }
      });

      return {
        success: true,
        message: `${task.type === 'DAILY' ? 'Daily task' : 'Task'} completed successfully`,
        isCompleted: true,
        completedAt: userTask.completedAt,
        points,
        totalStars: updatedUser.totalStars,
        earnedStars: updatedUser.earnedStars
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking Twitter task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check Twitter task' },
      { status: 500 }
    );
  }
}

async function validateSubmission(
  submissionUrl: string | null,
  channelUsername: string,
  userTwitterId: string | null
): Promise<void> {
  if (!submissionUrl) {
    throw new Error('Missing submission URL.');
  }

  if (!channelUsername) {
    throw new Error('Missing Twitter handle to mention in task data.');
  }

  const validTweetUrl = submissionUrl.match(/x\.com\/[^\/]+\/status\/(\d+)/);
  if (!validTweetUrl) {
    throw new Error('Invalid submission URL');
  }

  const existingSubmission = await prisma.userTask.findFirst({
    where: {
      submissionUrl: submissionUrl,
      isCompleted: true
    }
  });

  if (existingSubmission) {
    throw new Error('This submission URL has already been used.');
  }

  const tweetId = validTweetUrl[1];
  const tweetData = await getTweetData(tweetId);

  if (!tweetData) {
    throw new Error('Unable to retrieve tweet data.');
  }

  if (!userTwitterId) {
    throw new Error('User Twitter ID is missing');
  }

  if (tweetData.author_id !== userTwitterId) {
    throw new Error('This tweet does not belong to the connected Twitter account.');
  }

  if (!tweetData.text.includes(channelUsername)) {
    throw new Error(`Tweet does not mention ${channelUsername}`);
  }
}

async function validateFollowership(channelUsername: string, userTwitterHandle: string | null): Promise<void> {
  if (!channelUsername) {
    throw new Error('Missing Twitter handle in task data');
  }

  if (!userTwitterHandle) {
    throw new Error('User Twitter Handle is missing');
  }

  const handleExists = await twitterHandleExists(channelUsername);
  if (!handleExists) {
    throw new Error('Twitter handle does not exist');
  }

  const isFollowing = await checkUserFollowsTwitterChannel(userTwitterHandle, channelUsername);
  if (!isFollowing) {
    throw new Error('User is not following the Twitter channel');
  }
}
