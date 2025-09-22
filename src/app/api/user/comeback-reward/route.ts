// app/api/user/comeback-reward/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RewardType } from '@prisma/client';

interface RequestBody {
  initData: string;
}

interface ReminderThreshold {
  reminderSent: boolean;
  reminderTimestamp: Date | null;
}

interface RemindersData {
  day3?: ReminderThreshold;
  day6?: ReminderThreshold;
  day14?: ReminderThreshold;
}

// Define reward amounts for each reminder type
const REWARD_CONFIG = {
  day3: {
    type: RewardType.STARS,
    amount: 200
  },
  day6: {
    type: RewardType.STARS,
    amount: 500
  },
  day14: {
    type: RewardType.STARS,
    amount: 1000
  }
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

const defaultReminders = {
  day3: {
    reminderSent: false,
    reminderTimestamp: null
  },
  day6: {
    reminderSent: false,
    reminderTimestamp: null
  },
  day14: {
    reminderSent: false,
    reminderTimestamp: null
  }
};

function getMostRecentReminderToReward(reminders: RemindersData | null): {
  reminderType: string | null;
  rewardConfig: {
    type: RewardType;
    amount: number;
  } | null;
} {
  if (!reminders) {
    return { reminderType: null, rewardConfig: null };
  }

  if (reminders.day14?.reminderSent && reminders.day14.reminderTimestamp) {
    return {
      reminderType: 'day14',
      rewardConfig: REWARD_CONFIG.day14
    };
  }

  if (reminders.day6?.reminderSent && reminders.day6.reminderTimestamp) {
    return {
      reminderType: 'day6',
      rewardConfig: REWARD_CONFIG.day6
    };
  }

  if (reminders.day3?.reminderSent && reminders.day3.reminderTimestamp) {
    return {
      reminderType: 'day3',
      rewardConfig: REWARD_CONFIG.day3
    };
  }

  return { reminderType: null, rewardConfig: null };
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot token is missing' }, { status: 500 });
    }

    const requestBody: RequestBody = await req.json();
    const { initData: telegramInitData } = requestBody;

    if (!telegramInitData) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);
    if (!validatedData || !user.id) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id.toString();

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const result = await prisma.$transaction(async (prisma) => {
          const dbUser = await prisma.user.findUnique({
            where: { telegramId }
          });

          if (!dbUser) {
            throw new Error('User not found');
          }

          const reminders = dbUser.reminders ? (dbUser.reminders as any as RemindersData) : null;

          // Find most recent reminder that should be rewarded
          const { reminderType, rewardConfig } = getMostRecentReminderToReward(reminders);

          if (!reminderType || !rewardConfig) {
            return {
              success: false,
              message: 'No rewards to claim!',
              rewardType: null,
              rewardAmount: 0
            };
          }

          // Prepare update data for the user
          const updateData: any = {};

          // Reset all reminders
          updateData.reminders = defaultReminders;

          if (rewardConfig.type === RewardType.STARS) {
            updateData.totalStars = { increment: rewardConfig.amount };
          } else if (rewardConfig.type === RewardType.POINTS) {
            updateData.points = { increment: rewardConfig.amount };
            updateData.pointsBalance = { increment: rewardConfig.amount };
          }

          await prisma.user.update({
            where: { id: dbUser.id },
            data: updateData
          });

          const rewardTypeText = rewardConfig.type === RewardType.STARS ? 'Stars' : 'Points';

          return {
            success: true,
            message: `Welcome back, ${dbUser.name}! You've earned ${rewardConfig.amount} ${rewardTypeText} for returning.`,
            rewardType: rewardConfig.type,
            rewardAmount: rewardConfig.amount,
            reminderType: reminderType
          };
        });

        return NextResponse.json(result);
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
          retries++;
          if (retries >= MAX_RETRIES) {
            return NextResponse.json({ error: 'Failed to process request after multiple attempts' }, { status: 500 });
          }
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Failed to process request after max retries' }, { status: 500 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request',
        details: error instanceof Error ? error.message : null
      },
      { status: 500 }
    );
  }
}
