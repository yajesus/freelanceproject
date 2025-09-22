// app/api/tasks/check/verify/route.ts

import { NextResponse } from 'next/server';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import prisma from '@/utils/prisma';
import { calculateYieldPerHour } from '@/utils/calculations';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
interface CheckVerifyTaskRequestBody {
  initData: string;
  taskId: string;
}

export async function POST(req: Request) {
  const requestBody: CheckVerifyTaskRequestBody = await req.json();
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
    const result = await prisma.$transaction(
      async (prisma) => {
        // Step 1: Fetch user
        const dbUser = await prisma.user.findUnique({
          where: { telegramId }
        });

        if (!dbUser) {
          throw new Error('User not found');
        }

        // Step 2: Fetch task
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

        // Check if the task is of action VERIFY
        if (task.taskAction.name !== 'VERIFY') {
          throw new Error('Invalid task action for this operation');
        }

        // Calculate reset time for DAILY tasks - use standard reset time like visit route
        const now = new Date();
        const resetTime = new Date(now);
        resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);

        // If current time is before reset time, set reset time to previous day
        if (now < resetTime) {
          resetTime.setDate(resetTime.getDate() - 1);
        }

        const nextResetTime = new Date(resetTime.getTime() + 24 * 60 * 60 * 1000);

        // Step 3: Find or create userTask
        let userTask = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            ...(task.type === 'DAILY' && {
              taskStartTimestamp: {
                gte: resetTime
              }
            })
          }
        });

        // Create userTask if it doesn't exist
        if (!userTask) {
          userTask = await prisma.userTask.create({
            data: {
              userId: dbUser.id,
              taskId: task.id,
              taskStartTimestamp: new Date(),
              isCompleted: false
            }
          });
        }

        if (userTask.isCompleted) {
          throw new Error('Task already completed');
        }

        // Step 4: Task-specific verification logic using standard daily reset time
        if (task.title === 'Play one round of JOK Duel') {
          const todayDuelGame = await prisma.duelGame.findFirst({
            where: {
              userId: dbUser.telegramId,
              createdAt: {
                gte: resetTime,
                lt: nextResetTime
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          });

          if (!todayDuelGame) {
            return {
              success: false,
              message: 'No today activity found for this user.'
            };
          }
        } else {
          // Step 5: Fetch UserComboProgress for combo-related tasks
          const combo = await prisma.comboOfTheDay.findFirst({
            orderBy: {
              createdAt: 'desc'
            }
          });

          const comboProgress = await prisma.userComboProgress.findFirst({
            where: {
              userId: dbUser.id,
              comboDate: combo?.comboDate
            }
          });

          if (!comboProgress) {
            return {
              success: false,
              message: 'No combo record found for this user.'
            };
          }

          if (!comboProgress.discoveredIds || comboProgress.discoveredIds.length < 1) {
            return {
              success: false,
              message: 'Please upgrade combo first.'
            };
          }

          if (
            !(
              comboProgress.updatedAt &&
              comboProgress.updatedAt >= resetTime &&
              comboProgress.updatedAt < nextResetTime
            )
          ) {
            return {
              success: false,
              message: 'Please add more discoveries to your combo first.'
            };
          }
        }

        // All criteria passed, now handle task completion based on type
        if (task.type === 'DAILY') {
          // Check if already completed today
          const userTaskToday = await prisma.userTask.findFirst({
            where: {
              userId: dbUser.id,
              taskId: task.id,
              completedAt: {
                gte: resetTime,
                lt: nextResetTime
              }
            }
          });

          if (userTaskToday) {
            return {
              success: false,
              message: 'Daily task already completed.'
            };
          }

          // Update existing daily task entry
          const updatedUserTask = await prisma.userTask.update({
            where: { id: userTask.id },
            data: {
              isCompleted: true,
              completedAt: new Date()
            }
          });

          // Calculate points with multiplier for daily tasks
          const pointsToIncrement = task.points || 0;
          const pointsMultiplier = task.multiplier || 2; // Daily tasks get 2x multiplier
          const userYieldPerHour = dbUser.yieldPerHour || 0;
          const userBonusYield = dbUser.bonusYieldPerHour || 0;
          const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
          const points = Math.round(pointsToIncrement + totalMultiplier);

          // Update user's points and stars
          const updatedUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              points: { increment: points },
              pointsBalance: { increment: points },
              totalStars: { increment: task.rewardStars || 0 },
              earnedStars: { increment: task.rewardStars || 0 }
            }
          });

          // Create transaction record
          await prisma.transaction.create({
            data: {
              userId: dbUser.id,
              sourceId: updatedUserTask.id,
              amount: task.rewardStars || 0,
              type: TransactionType.EARNED,
              status: TransactionStatus.COMPLETED,
              description: `Daily task reward: ${task.title}`
            }
          });

          return {
            success: true,
            message: 'Daily verify task completed successfully!',
            isCompleted: updatedUserTask.isCompleted,
            completedAt: updatedUserTask.completedAt,
            points,
            totalStars: updatedUser.totalStars,
            earnedStars: updatedUser.earnedStars
          };
        } else {
          // For non-daily tasks, update existing task
          const updatedUserTask = await prisma.userTask.update({
            where: { id: userTask.id },
            data: {
              isCompleted: true,
              completedAt: new Date()
            }
          });

          // Calculate points with multiplier
          const pointsToIncrement = task.points || 0;
          const pointsMultiplier = task.multiplier || 1.5; // Regular tasks get 1.5x multiplier
          const userYieldPerHour = dbUser.yieldPerHour || 0;
          const userBonusYield = dbUser.bonusYieldPerHour || 0;
          const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
          const points = Math.round(pointsToIncrement + totalMultiplier);

          // Update user's points and stars
          const updatedUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              points: { increment: points },
              pointsBalance: { increment: points },
              totalStars: { increment: task.rewardStars || 0 },
              earnedStars: { increment: task.rewardStars || 0 }
            }
          });

          // Create transaction record
          await prisma.transaction.create({
            data: {
              userId: dbUser.id,
              sourceId: updatedUserTask.id,
              amount: task.rewardStars || 0,
              type: TransactionType.EARNED,
              status: TransactionStatus.COMPLETED,
              description: `Task reward: ${task.title}`
            }
          });

          return {
            success: true,
            message: 'Task Verified!',
            isCompleted: updatedUserTask.isCompleted,
            completedAt: updatedUserTask.completedAt,
            points,
            totalStars: updatedUser.totalStars,
            earnedStars: updatedUser.earnedStars
          };
        }
      },
      { timeout: 20000 }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking verify task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify task'
      },
      { status: 500 }
    );
  }
}
