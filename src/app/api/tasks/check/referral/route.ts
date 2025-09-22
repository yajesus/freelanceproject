// app/api/tasks/check/referral/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { calculateYieldPerHour } from '@/utils/calculations';
import { TransactionStatus, TransactionType } from '@prisma/client';

interface CheckReferralTaskRequestBody {
  initData: string;
  taskId: string;
}

export async function POST(req: Request) {
  const requestBody: CheckReferralTaskRequestBody = await req.json();
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
        where: { telegramId },
        include: { referrals: true }
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

      if (task.taskAction.name !== 'REFERRAL' || !task.taskData) {
        throw new Error('Invalid task action or missing task data for this operation');
      }

      // Calculate points
      const pointsToIncrement = task.points || 0;
      const pointsMultiplier = task.multiplier || (task.type === 'DAILY' ? 2 : 1.5);
      const userYieldPerHour = dbUser.yieldPerHour || 0;
      const userBonusYield = dbUser.bonusYieldPerHour || 0;
      const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
      const points = Math.round(pointsToIncrement + totalMultiplier);

      // Check referral requirements
      const requiredReferrals = (task.taskData as any).friendsNumber || 0;
      const currentReferrals = dbUser.referrals.length + (dbUser.fakeFriends ?? 0);

      if (currentReferrals < requiredReferrals) {
        return {
          success: false,
          message: `You need ${requiredReferrals - currentReferrals} more referrals to complete this ${
            task.type === 'DAILY' ? 'daily ' : ''
          }task.`,
          currentReferrals,
          requiredReferrals
        };
      }

      if (task.type === 'DAILY') {
        // Check for daily task completion within the reset window
        const now = new Date();
        const resetTime = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TASK_DAILY_RESET_TIME, 0, 0)
        );
        const nextResetTime = new Date(resetTime.getTime() + 24 * 60 * 60 * 1000);

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
            message: 'Daily task already completed.',
            currentReferrals,
            requiredReferrals
          };
        }

        // Find the existing task that was started within the current reset window
        const existingUserTask = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            taskStartTimestamp: {
              gte: resetTime,
              lt: nextResetTime
            }
          }
        });

        if (!existingUserTask) {
          return {
            success: false,
            message: 'Daily task not started in the current reset period. Please start the task first.',
            currentReferrals,
            requiredReferrals
          };
        }

        // Update existing daily task entry
        const updatedUserTask = await prisma.userTask.update({
          where: {
            id: existingUserTask.id
          },
          data: {
            isCompleted: true,
            completedAt: new Date()
          }
        });

        // Update user points
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
            sourceId: updatedUserTask.id,
            amount: task.rewardStars || 0,
            type: TransactionType.EARNED,
            status: TransactionStatus.COMPLETED,
            description: `Daily task reward: ${task.title}`
          }
        });

        return {
          success: true,
          message: 'Daily Task completed successfully',
          isCompleted: updatedUserTask.isCompleted,
          currentReferrals,
          requiredReferrals,
          points,
          totalStars: updatedUser.totalStars,
          earnedStars: updatedUser.earnedStars
        };
      } else {
        // For non-daily tasks
        const existingUserTask = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            isCompleted: true
          }
        });

        if (existingUserTask) {
          return {
            success: false,
            message: 'Task already completed',
            currentReferrals,
            requiredReferrals
          };
        }

        // Create new task entry
        const newUserTask = await prisma.userTask.create({
          data: {
            userId: dbUser.id,
            taskId: task.id,
            isCompleted: true,
            completedAt: new Date()
          }
        });

        // Update user points
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
            sourceId: newUserTask.id,
            amount: task.rewardStars || 0,
            type: TransactionType.EARNED,
            status: TransactionStatus.COMPLETED,
            description: `Task reward: ${task.title}`
          }
        });

        return {
          success: true,
          message: 'Task completed successfully',
          isCompleted: newUserTask.isCompleted,
          completedAt: newUserTask.completedAt,
          currentReferrals,
          requiredReferrals,
          points,
          totalStars: updatedUser.totalStars,
          earnedStars: updatedUser.earnedStars
        };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking referral task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check referral task' },
      { status: 500 }
    );
  }
}
