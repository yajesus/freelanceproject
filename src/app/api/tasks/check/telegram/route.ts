// app/api/tasks/check/telegram/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { calculateYieldPerHour } from '@/utils/calculations';
import { TransactionStatus, TransactionType } from '@prisma/client';

interface CheckTelegramTaskRequestBody {
  initData: string;
  taskId: string;
}

export async function POST(req: Request) {
  const botToken = process.env.BOT_TOKEN;
  const channelAdminToken = process.env.CHANNEL_ADMIN_BOT_TOKEN;

  if (!botToken || !channelAdminToken) {
    return NextResponse.json({ error: 'Telegram bot token is missing' }, { status: 500 });
  }

  const requestBody: CheckTelegramTaskRequestBody = await req.json();
  const { initData: telegramInitData, taskId } = requestBody;

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
        where: { telegramId }
      });

      if (!dbUser) {
        throw new Error('User not found in database');
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

      // Check if the task is of action TELEGRAM
      if (task.taskAction.name !== 'TELEGRAM' || !task.taskData) {
        throw new Error('Invalid task action or missing task data for this operation');
      }

      const channelUsername = (task.taskData as any).chatId;
      if (!channelUsername) {
        throw new Error('Missing Telegram channel/group username in task data');
      }

      // Check if the user is a member of the channel/group
      let isMember = false;
      try {
        let formattedChatId = channelUsername;
        if (!channelUsername.startsWith('@') && !channelUsername.startsWith('-100')) {
          formattedChatId = '@' + channelUsername;
        }

        const url = `https://api.telegram.org/bot${channelAdminToken}/getChatMember?chat_id=${encodeURIComponent(
          formattedChatId
        )}&user_id=${telegramId}`;

        console.log('Checking channel membership:', url);

        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Telegram API error:', response.status, errorText);
          throw new Error(`Telegram API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('Telegram API response:', data);

        if (data.ok) {
          const status = data.result.status;
          if (status === 'restricted') {
            isMember = data.result.is_member;
          } else {
            isMember = ['creator', 'administrator', 'member'].includes(status);
          }
        } else {
          throw new Error(`Telegram API returned false: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        console.error('Error checking channel membership:', error);
        if (error instanceof Error) {
          throw new Error(`Failed to check channel membership: ${error.message}`);
        } else {
          throw new Error('Failed to check channel membership: Unknown error');
        }
      }

      if (!isMember) {
        return {
          success: false,
          message: 'You are not a member of the required Telegram channel/group.'
        };
      }

      // Calculate points
      const pointsToIncrement = task.points || 0;
      const pointsMultiplier = task.multiplier || (task.type === 'DAILY' ? 2 : 1.5);
      const userYieldPerHour = dbUser.yieldPerHour || 0;
      const userBonusYield = dbUser.bonusYieldPerHour || 0;
      const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
      const points = Math.round(pointsToIncrement + totalMultiplier);

      if (task.type === 'DAILY') {
        // Check for daily task completion within the reset window
        const now = new Date();
        const startOfTodayUTC = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TASK_DAILY_RESET_TIME, 0, 0)
        );
        const endOfTodayUTC = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, TASK_DAILY_RESET_TIME, 0, 0)
        );

        const userTaskToday = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            completedAt: {
              gte: startOfTodayUTC,
              lt: endOfTodayUTC
            }
          }
        });

        if (userTaskToday) {
          return {
            success: false,
            message: 'Daily task already completed.'
          };
        }

        // Create new daily task entry
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
            description: `Telegram Daily Check-In: ${task.rewardStars} stars`
          }
        });

        return {
          success: true,
          message: 'Daily Task completed successfully',
          isCompleted: newUserTask.isCompleted,
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
            message: 'Task already completed'
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
            description: `Telegram Task: ${task.rewardStars} stars`
          }
        });

        return {
          success: true,
          message: 'Task completed successfully',
          isCompleted: newUserTask.isCompleted,
          completedAt: newUserTask.completedAt,
          points,
          totalStars: updatedUser.totalStars,
          earnedStars: updatedUser.earnedStars
        };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking Telegram task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check Telegram task' },
      { status: 500 }
    );
  }
}
