// app/api/tasks/check/story/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateYieldPerHour } from '@/utils/calculations';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';

interface CheckStoryTaskRequestBody {
  initData: string;
  taskId: string;
}

export async function POST(req: Request) {
  const requestBody: CheckStoryTaskRequestBody = await req.json();
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

        if (task.type === 'DAILY') {
          // For daily tasks, check if the task was completed within the current reset window
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

          const userTaskToday = await prisma.userTask.findFirst({
            where: {
              userId: dbUser.id,
              taskId: task.id,
              completedAt: {
                gte: startOfCurrentWindow,
                lt: endOfCurrentWindow
              }
            }
          });

          if (userTaskToday) {
            return {
              success: false,
              message: 'Daily story task already completed today'
            };
          }

          // Find the user's task entry that was started within the current reset window
          const userTask = await prisma.userTask.findFirst({
            where: {
              userId: dbUser.id,
              taskId: task.id,
              taskStartTimestamp: {
                gte: startOfCurrentWindow,
                lt: endOfCurrentWindow
              }
            }
          });

          // If no user task record exists for the current window, the task was never properly started
          if (!userTask) {
            throw new Error('Daily story task not started in the current reset window. Please start the task first.');
          }

          // Check if the task is already completed
          if (userTask.isCompleted) {
            return {
              success: false,
              message: 'Daily story task already completed today'
            };
          }

          // Update the task as completed
          const updatedUserTask = await prisma.userTask.update({
            where: {
              id: userTask.id
            },
            data: {
              isCompleted: true,
              completedAt: new Date()
            }
          });

          // Calculate points with bonuses
          const pointsToIncrement = task.points || 0;
          const pointsMultiplier = task.multiplier || 2; // Daily tasks have 2x multiplier
          const userYieldPerHour = dbUser.yieldPerHour || 0;
          const userBonusYield = dbUser.bonusYieldPerHour || 0;
          const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
          const points = Math.round(pointsToIncrement + totalMultiplier);

          // Add points to user's balance
          const updatedUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              points: { increment: points },
              pointsBalance: { increment: points },
              totalStars: { increment: task.rewardStars || 0 },
              earnedStars: { increment: task.rewardStars || 0 }
            }
          });

          return {
            success: true,
            message: 'Daily story shared successfully!',
            isCompleted: updatedUserTask.isCompleted,
            completedAt: updatedUserTask.completedAt,
            points,
            totalStars: updatedUser.totalStars,
            earnedStars: updatedUser.earnedStars
          };
        } else {
          // For non-daily tasks
          const userTask = await prisma.userTask.findFirst({
            where: {
              userId: dbUser.id,
              taskId: task.id
            }
          });

          // If no user task record exists, the task was never properly started
          if (!userTask) {
            throw new Error('Story task not started. Please start the task first.');
          }

          // Check if the task is already completed
          if (userTask.isCompleted) {
            return {
              success: false,
              message: 'Story task already completed'
            };
          }

          // Update the task as completed
          const updatedUserTask = await prisma.userTask.update({
            where: {
              id: userTask.id
            },
            data: {
              isCompleted: true,
              completedAt: new Date()
            }
          });

          // Calculate points with bonuses
          const pointsToIncrement = task.points || 0;
          const pointsMultiplier = task.multiplier || 1.5; // Non-daily tasks have 1.5x multiplier
          const userYieldPerHour = dbUser.yieldPerHour || 0;
          const userBonusYield = dbUser.bonusYieldPerHour || 0;
          const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
          const points = Math.round(pointsToIncrement + totalMultiplier);

          // Add points to user's balance
          const updatedUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              points: { increment: points },
              pointsBalance: { increment: points },
              totalStars: { increment: task.rewardStars || 0 },
              earnedStars: { increment: task.rewardStars || 0 }
            }
          });

          return {
            success: true,
            message: 'Story shared successfully!',
            isCompleted: updatedUserTask.isCompleted,
            completedAt: updatedUserTask.completedAt,
            points,
            totalStars: updatedUser.totalStars,
            earnedStars: updatedUser.earnedStars
          };
        }
      },
      { timeout: 10000 }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking story task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check story task'
      },
      { status: 500 }
    );
  }
}
