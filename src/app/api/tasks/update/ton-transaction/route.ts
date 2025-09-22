// app/api/tasks/update/ton-transaction/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { calculateYieldPerHour } from '@/utils/calculations';
import { TransactionStatus, TransactionType } from '@prisma/client';

interface UpdateTONTaskRequestBody {
  initData: string;
  taskId: string;
  transactionHash: string;
  transactionData: any;
}

export async function POST(req: Request) {
  try {
    const requestBody: UpdateTONTaskRequestBody = await req.json();
    const { initData: telegramInitData, taskId, transactionHash, transactionData } = requestBody;

    if (!telegramInitData || !taskId || !transactionHash) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();

    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (prisma) => {
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

      if (!task.isActive) {
        throw new Error('This task is no longer active');
      }

      if (task.taskAction.name !== 'VISIT' || task.type !== 'DAILY' || task.title !== 'TON Daily Check-In') {
        throw new Error('Invalid task type for TON transaction');
      }

      // Check for daily reset
      const now = new Date();
      const resetTime = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TASK_DAILY_RESET_TIME, 0, 0)
      );

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

      if (existingTaskToday?.isCompleted) {
        throw new Error('Daily TON task already completed today');
      }

      // Prepare transaction metadata
      const transactionStatus =
        transactionData?.success !== false &&
        !transactionData?.aborted &&
        !transactionData?.destroyed &&
        !transactionData?.error
          ? 'SUCCESS'
          : 'FAILED';

      const metadata = {
        transactionHash,
        transactionStatus,
        transactionTimestamp: now.toISOString(),
        transactionData: {
          success: transactionData?.success,
          aborted: transactionData?.aborted,
          destroyed: transactionData?.destroyed,
          error: transactionData?.error,
          outMsgsValue: transactionData?.out_msgs?.[0]?.value,
          utime: transactionData?.utime,
          lt: transactionData?.lt
        }
      };

      // const isTransactionValid = await verifyTONTransaction({
      //   amount: DAILY_TON_TRANSACTION_AMOUNT,
      //   walletAddress: dbUser.tonWalletAddress
      // });

      // if (!isTransactionValid) {
      //   throw new Error('Invalid or missing TON transaction');
      // }

      // Create or update UserTask with metadata
      const userTask = existingTaskToday
        ? await prisma.userTask.update({
            where: { id: existingTaskToday.id },
            data: {
              isCompleted: true,
              completedAt: now,
              metadata
            }
          })
        : await prisma.userTask.create({
            data: {
              userId: dbUser.id,
              taskId: task.id,
              taskStartTimestamp: now,
              isCompleted: true,
              completedAt: now,
              metadata
            }
          });

      const pointsToIncrement = task.points || 0;
      const pointsMultiplier = task.multiplier || 2; // Default multiplier for daily tasks
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

      await prisma.transaction.create({
        data: {
          userId: dbUser.id,
          sourceId: userTask.id,
          amount: task.rewardStars || 0,
          type: TransactionType.EARNED,
          status: TransactionStatus.COMPLETED,
          description: `TON Daily Check-In: ${task.rewardStars} stars (Hash: ${transactionHash.substring(0, 8)}...)`
        }
      });

      return {
        success: true,
        message: 'TON task completed successfully',
        isCompleted: true,
        completedAt: userTask.completedAt,
        points,
        totalStars: updatedUser.totalStars,
        earnedStars: updatedUser.earnedStars,
        transactionHash,
        transactionStatus
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing TON task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process TON task', success: false },
      { status: 500 }
    );
  }
}
