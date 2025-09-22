// app/api/cron/send-reminders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import dayjs from 'dayjs';
import { sendPhotoToUser } from '@/utils/telegram';
import {
  TELEGRAM_REMINDER_MESSAGE_14_DAYS,
  TELEGRAM_REMINDER_MESSAGE_14_DAYS_BUTTON,
  TELEGRAM_REMINDER_MESSAGE_14_DAYS_IMAGE,
  TELEGRAM_REMINDER_MESSAGE_3_DAYS,
  TELEGRAM_REMINDER_MESSAGE_3_DAYS_BUTTON,
  TELEGRAM_REMINDER_MESSAGE_3_DAYS_IMAGE,
  TELEGRAM_REMINDER_MESSAGE_6_DAYS,
  TELEGRAM_REMINDER_MESSAGE_6_DAYS_BUTTON,
  TELEGRAM_REMINDER_MESSAGE_6_DAYS_IMAGE,
  TELEGRAM_DAILY_REMINDER_MESSAGES,
  TELEGRAM_DAILY_REMINDER_IMAGES,
  TELEGRAM_DAILY_REMINDER_BUTTONS
} from '@/utils/consts';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Maximum number of reminders to send per cron job execution
const BATCH_SIZE = 20;

// Process messages sequentially to avoid rate limiting
const TELEGRAM_DELAY_MS = 100; // 100ms delay between Telegram API calls

// Reminder message mappings
const REMINDER_CONFIG: Record<
  number,
  {
    message: string;
    photo: string;
    btnText: string;
  }
> = {
  3: {
    message: TELEGRAM_REMINDER_MESSAGE_3_DAYS,
    photo: TELEGRAM_REMINDER_MESSAGE_3_DAYS_IMAGE,
    btnText: TELEGRAM_REMINDER_MESSAGE_3_DAYS_BUTTON
  },
  6: {
    message: TELEGRAM_REMINDER_MESSAGE_6_DAYS,
    photo: TELEGRAM_REMINDER_MESSAGE_6_DAYS_IMAGE,
    btnText: TELEGRAM_REMINDER_MESSAGE_6_DAYS_BUTTON
  },
  14: {
    message: TELEGRAM_REMINDER_MESSAGE_14_DAYS,
    photo: TELEGRAM_REMINDER_MESSAGE_14_DAYS_IMAGE,
    btnText: TELEGRAM_REMINDER_MESSAGE_14_DAYS_BUTTON
  }
};

interface ReminderThreshold {
  reminderSent: boolean;
  reminderTimestamp: Date | null;
}

interface DailyReminder {
  lastDailyReminderIndex: number;
  lastDailyReminderTimestamp: Date | null;
}

interface RemindersData {
  day3?: ReminderThreshold;
  day6?: ReminderThreshold;
  day14?: ReminderThreshold;
  dailyReminders?: DailyReminder;
}

const botUrl = `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}/${process.env.NEXT_PUBLIC_APP_URL_SHORT_NAME}`;

// Verify authorization
// function verifyAuth(req: NextRequest): boolean {
//   const CRON_SECRET = process.env.CRON_SECRET;
//   const authHeader = req.headers.get('authorization');
//   return !!CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
// }

// Main endpoint handler
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const batchNumber = parseInt(searchParams.get('batch') || '0', 10);
    const mode = searchParams.get('mode') || 'standard'; // 'standard' or 'daily'
    const skip = batchNumber * BATCH_SIZE;

    console.log(`Processing ${mode} reminder batch ${batchNumber} (users ${skip}-${skip + BATCH_SIZE})`);

    if (mode === 'standard') {
      return await processStandardRemindersBatch(batchNumber, skip);
    } else {
      return await processDailyRemindersBatch(batchNumber, skip);
    }
  } catch (error) {
    console.error('Error processing reminder batch:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process reminder batch',
        details: (error as Error).message,
        batch: parseInt(req.nextUrl.searchParams.get('batch') || '0', 10)
      },
      { status: 500 }
    );
  }
}

async function processStandardRemindersBatch(batchNumber: number, skip: number) {
  // Find users eligible for standard reminders (3, 6, 14 days)
  const users = await prisma.user.findMany({
    where: {
      telegramId: { not: '' },
      lastUpgradeYieldTimestamp: {
        lt: dayjs().subtract(3, 'day').toDate() // At least 3 days inactive
      },
      OR: [
        // 14-day reminder not sent
        {
          lastUpgradeYieldTimestamp: { lt: dayjs().subtract(14, 'day').toDate() },
          OR: [
            { reminders: { equals: null } },
            { reminders: { not: { path: ['day14', 'reminderSent'], equals: true } } }
          ]
        },
        // 6-day reminder not sent
        {
          lastUpgradeYieldTimestamp: {
            lt: dayjs().subtract(6, 'day').toDate(),
            gte: dayjs().subtract(14, 'day').toDate()
          },
          OR: [
            { reminders: { equals: null } },
            { reminders: { not: { path: ['day6', 'reminderSent'], equals: true } } }
          ]
        },
        // 3-day reminder not sent
        {
          lastUpgradeYieldTimestamp: {
            lt: dayjs().subtract(3, 'day').toDate(),
            gte: dayjs().subtract(6, 'day').toDate()
          },
          OR: [
            { reminders: { equals: null } },
            { reminders: { not: { path: ['day3', 'reminderSent'], equals: true } } }
          ]
        }
      ]
    },
    select: {
      id: true,
      telegramId: true,
      lastUpgradeYieldTimestamp: true,
      reminders: true
    },
    skip,
    take: BATCH_SIZE,
    orderBy: { lastUpgradeYieldTimestamp: 'asc' }
  });

  const hasMoreBatches = users.length === BATCH_SIZE;

  console.log(`Found ${users.length} users for standard reminders in batch ${batchNumber}`);

  // If no users in this batch, check if we should switch to daily reminders
  if (users.length === 0) {
    console.log('No more users for standard reminders, starting daily reminders...');

    // Trigger daily reminders starting from batch 0
    setTimeout(async () => {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/cron/send-reminders?batch=0&mode=daily`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Next.js-Internal-Request'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Daily reminders batch 0 triggered successfully:', result);
      } catch (error) {
        console.error('Failed to trigger daily reminders batch 0:', error);
      }
    }, 500);

    return NextResponse.json({
      success: true,
      message: 'Standard reminders completed, daily reminders started',
      batch: { current: batchNumber, mode: 'standard', switchedToDaily: true }
    });
  }

  // Filter and process eligible users
  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const user of users) {
    const reminders = user.reminders as RemindersData | null;
    const threshold = getMostAppropriateReminderThreshold(user.lastUpgradeYieldTimestamp, reminders);

    if (!threshold) {
      results.skipped++;
      continue;
    }

    try {
      const config = REMINDER_CONFIG[threshold];

      // Send message with delay to respect rate limits
      await sendPhotoToUser(user.telegramId, config.photo, config.message, config.btnText, botUrl);
      await new Promise((resolve) => setTimeout(resolve, TELEGRAM_DELAY_MS));

      // Update user record
      const updatedReminders: RemindersData = { ...(reminders || {}) };
      const reminderKey = `day${threshold}` as 'day3' | 'day6' | 'day14';
      updatedReminders[reminderKey] = {
        reminderSent: true,
        reminderTimestamp: new Date()
      };

      await prisma.user.update({
        where: { id: user.id },
        data: { reminders: updatedReminders as any }
      });

      results.sent++;
      console.log(`✅ Sent ${threshold}-day reminder to user ${user.telegramId}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder to user ${user.telegramId}:`, error);
      results.failed++;
    }
  }

  const response = {
    success: true,
    batch: {
      current: batchNumber,
      mode: 'standard',
      size: BATCH_SIZE,
      hasMore: hasMoreBatches,
      next: hasMoreBatches ? batchNumber + 1 : null,
      nextMode: hasMoreBatches ? 'standard' : 'daily'
    },
    stats: {
      processed: users.length,
      sent: results.sent,
      failed: results.failed,
      skipped: results.skipped
    }
  };

  // Self-chaining: if hasMoreBatches, trigger next batch
  if (hasMoreBatches) {
    console.log(`Triggering next standard batch: ${batchNumber + 1}`);

    // Use setTimeout to ensure the current request completes first
    setTimeout(async () => {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/cron/send-reminders?batch=${batchNumber + 1}&mode=standard`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Next.js-Internal-Request'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`Next standard batch ${batchNumber + 1} triggered successfully:`, result);
      } catch (error) {
        console.error(`Failed to trigger next standard batch ${batchNumber + 1}:`, error);
      }
    }, 500);
  }

  return NextResponse.json(response);
}

async function processDailyRemindersBatch(batchNumber: number, skip: number) {
  // Find users eligible for daily reminders (24h+ but less than 3 days)
  const users = await prisma.user.findMany({
    where: {
      telegramId: { not: '' },
      lastUpgradeYieldTimestamp: {
        lt: dayjs().subtract(24, 'hour').toDate(),
        gt: dayjs().subtract(3, 'day').toDate()
      },
      // Exclude users who have received any standard reminders
      AND: [
        {
          OR: [
            { reminders: { equals: null } },
            { reminders: { not: { path: ['day3', 'reminderSent'], equals: true } } }
          ]
        },
        {
          OR: [
            { reminders: { equals: null } },
            { reminders: { not: { path: ['day6', 'reminderSent'], equals: true } } }
          ]
        },
        {
          OR: [
            { reminders: { equals: null } },
            { reminders: { not: { path: ['day14', 'reminderSent'], equals: true } } }
          ]
        }
      ]
    },
    select: {
      id: true,
      telegramId: true,
      lastUpgradeYieldTimestamp: true,
      reminders: true
    },
    skip,
    take: BATCH_SIZE,
    orderBy: { lastUpgradeYieldTimestamp: 'asc' }
  });

  const hasMoreBatches = users.length === BATCH_SIZE;

  console.log(`Found ${users.length} users for daily reminders in batch ${batchNumber}`);

  // If no users in this batch, we're completely done
  if (users.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'All reminders processing completed',
      batch: { current: batchNumber, mode: 'daily', completed: true }
    });
  }

  // Filter and process eligible users
  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const user of users) {
    const reminders = user.reminders as RemindersData | null;

    if (!shouldSendDailyReminder(user.lastUpgradeYieldTimestamp, reminders)) {
      results.skipped++;
      continue;
    }

    try {
      const reminderIndex = getNextDailyReminderIndex(reminders);

      // Send message with delay to respect rate limits
      await sendPhotoToUser(
        user.telegramId,
        TELEGRAM_DAILY_REMINDER_IMAGES[reminderIndex],
        TELEGRAM_DAILY_REMINDER_MESSAGES[reminderIndex],
        TELEGRAM_DAILY_REMINDER_BUTTONS[reminderIndex],
        botUrl
      );
      await new Promise((resolve) => setTimeout(resolve, TELEGRAM_DELAY_MS));

      // Update user record
      const updatedReminders: RemindersData = { ...(reminders || {}) };
      updatedReminders.dailyReminders = {
        lastDailyReminderIndex: reminderIndex,
        lastDailyReminderTimestamp: new Date()
      };

      await prisma.user.update({
        where: { id: user.id },
        data: { reminders: updatedReminders as any }
      });

      results.sent++;
      console.log(`✅ Sent daily reminder #${reminderIndex} to user ${user.telegramId}`);
    } catch (error) {
      console.error(`❌ Failed to send daily reminder to user ${user.telegramId}:`, error);
      results.failed++;
    }
  }

  const response = {
    success: true,
    batch: {
      current: batchNumber,
      mode: 'daily',
      size: BATCH_SIZE,
      hasMore: hasMoreBatches,
      next: hasMoreBatches ? batchNumber + 1 : null,
      completed: !hasMoreBatches
    },
    stats: {
      processed: users.length,
      sent: results.sent,
      failed: results.failed,
      skipped: results.skipped
    }
  };

  // Self-chaining: if hasMoreBatches, trigger next batch
  if (hasMoreBatches) {
    console.log(`Triggering next daily batch: ${batchNumber + 1}`);

    // Use setTimeout to ensure the current request completes first
    setTimeout(async () => {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/cron/send-reminders?batch=${batchNumber + 1}&mode=daily`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Next.js-Internal-Request'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`Next daily batch ${batchNumber + 1} triggered successfully:`, result);
      } catch (error) {
        console.error(`Failed to trigger next daily batch ${batchNumber + 1}:`, error);
      }
    }, 500);
  }

  return NextResponse.json(response);
}

// Helper functions
function getMostAppropriateReminderThreshold(lastActivityDate: Date, reminders: RemindersData | null): number | null {
  const daysSinceActivity = dayjs().diff(dayjs(lastActivityDate), 'day');

  if (daysSinceActivity >= 14 && (!reminders?.day14 || !reminders.day14.reminderSent)) {
    return 14;
  } else if (daysSinceActivity >= 6 && (!reminders?.day6 || !reminders.day6.reminderSent)) {
    return 6;
  } else if (daysSinceActivity >= 3 && (!reminders?.day3 || !reminders.day3.reminderSent)) {
    return 3;
  }

  return null;
}

function shouldSendDailyReminder(lastActivityDate: Date, reminders: RemindersData | null): boolean {
  const hoursSinceActivity = dayjs().diff(dayjs(lastActivityDate), 'hour');
  const daysSinceActivity = dayjs().diff(dayjs(lastActivityDate), 'day');

  // Don't send daily reminders if user qualifies for standard reminders
  if (daysSinceActivity >= 3) return false;

  // Don't send if any standard reminders have been sent
  if (reminders?.day3?.reminderSent || reminders?.day6?.reminderSent || reminders?.day14?.reminderSent) {
    return false;
  }

  // Must be inactive for at least 24 hours
  if (hoursSinceActivity < 24) return false;

  // Check if we've sent a daily reminder in the past 24 hours
  if (reminders?.dailyReminders?.lastDailyReminderTimestamp) {
    const hoursSinceLastReminder = dayjs().diff(dayjs(reminders.dailyReminders.lastDailyReminderTimestamp), 'hour');
    return hoursSinceLastReminder >= 24;
  }

  return true;
}

function getNextDailyReminderIndex(reminders: RemindersData | null): number {
  if (!reminders?.dailyReminders) return 0;

  const lastIndex = reminders.dailyReminders.lastDailyReminderIndex;
  return (lastIndex + 1) % TELEGRAM_DAILY_REMINDER_MESSAGES.length;
}
