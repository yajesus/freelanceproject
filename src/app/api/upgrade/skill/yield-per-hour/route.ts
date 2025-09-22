// app/api/upgrade/skill/yield-per-hour/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MAX_YIELD_HOURS } from '@/utils/consts';
import dayjs from 'dayjs';

interface YieldPerHourRequestBody {
  initData: string;
  requestType: 'startup' | 'periodic';
}

interface YieldBreakdown {
  actualOfflineHours: number; // How long user was actually offline
  maxAllowedHours: number; // Maximum base time allowed (e.g., 3 hours)
  bonusHours: number; // Additional bonus time available (e.g., 1 hour)
  usedHours: number; // Hours actually used for calculation (capped)
  hasBonusTime: boolean; // Whether user has any bonus time
}

interface YieldResult {
  success: boolean;
  message: string;
  points: number;
  lastTimestamp: Date;
  earnedPoints: number;
  effectiveDuration: number;
  yieldBreakdown: YieldBreakdown;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds
const MIN_UPDATE_INTERVAL = 60000; // 1 minute in milliseconds

class YieldCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YieldCalculationError';
  }
}

const calculateTotalYieldPerHour = (
  baseYield: number,
  bonusYield: number,
  rewardBoostEndTime: Date | null,
  rewardBoostMultiplier: number,
  currentTime: Date
): number => {
  let totalMultiplier = 1;

  if (bonusYield > 0) {
    totalMultiplier += bonusYield / 100;
  }

  if (rewardBoostEndTime && currentTime < rewardBoostEndTime) {
    totalMultiplier += rewardBoostMultiplier;
  }

  return baseYield * totalMultiplier;
};

const calculatePoints = (
  lastYieldTimestamp: Date,
  currentTime: Date,
  upgradeYieldPerHour: number,
  bonusYieldPerHour: number,
  bonusOfflineYieldDuration: number,
  activeOfflineBoostEndTime: Date | null,
  activeOfflineBoostDuration: number,
  activeRewardBoostEndTime: Date | null,
  activeRewardBoostMultiplier: number,
  isStartup: boolean
): { points: number; effectiveDuration: number; yieldBreakdown: YieldBreakdown } => {
  const millisecondsElapsed = currentTime.getTime() - lastYieldTimestamp.getTime();

  if (millisecondsElapsed < MIN_UPDATE_INTERVAL) {
    throw new YieldCalculationError('At least 1 minute must pass between updates');
  }

  const actualOfflineHours = millisecondsElapsed / 3600000;

  if (!isStartup) {
    // Periodic updates - no caps
    const points = Math.floor(
      actualOfflineHours *
        calculateTotalYieldPerHour(
          upgradeYieldPerHour,
          bonusYieldPerHour,
          activeRewardBoostEndTime,
          activeRewardBoostMultiplier,
          currentTime
        )
    );

    return {
      points,
      effectiveDuration: actualOfflineHours,
      yieldBreakdown: {
        actualOfflineHours,
        maxAllowedHours: actualOfflineHours,
        bonusHours: 0,
        usedHours: actualOfflineHours,
        hasBonusTime: false
      }
    };
  }

  // Startup calculation
  const maxAllowedHours = MAX_YIELD_HOURS; // Base max hours (e.g., 3)
  const bonusHours = bonusOfflineYieldDuration / 60; // Convert minutes to hours
  const hasBonusTime = bonusHours > 0;

  // Total maximum reward time = base + bonus
  const totalMaxRewardTime = maxAllowedHours + bonusHours;

  // Handle offline boost if active (this can extend beyond base + bonus)
  let finalMaxTime = totalMaxRewardTime;
  if (activeOfflineBoostEndTime && currentTime < activeOfflineBoostEndTime) {
    finalMaxTime = Math.max(totalMaxRewardTime, activeOfflineBoostDuration);
  }

  // Hours used for reward calculation (capped at max allowed)
  const usedHours = Math.min(actualOfflineHours, finalMaxTime);

  // Calculate points with time-based multipliers
  let totalPoints = 0;
  let remainingHours = usedHours;

  if (
    activeRewardBoostEndTime &&
    activeRewardBoostEndTime > lastYieldTimestamp &&
    activeRewardBoostEndTime <= currentTime
  ) {
    const boostedHours = Math.min(
      (activeRewardBoostEndTime.getTime() - lastYieldTimestamp.getTime()) / 3600000,
      remainingHours
    );

    totalPoints +=
      boostedHours *
      calculateTotalYieldPerHour(
        upgradeYieldPerHour,
        bonusYieldPerHour,
        activeRewardBoostEndTime,
        activeRewardBoostMultiplier,
        activeRewardBoostEndTime
      );
    remainingHours -= boostedHours;
  }

  if (remainingHours > 0) {
    totalPoints +=
      remainingHours *
      calculateTotalYieldPerHour(
        upgradeYieldPerHour,
        bonusYieldPerHour,
        activeRewardBoostEndTime,
        activeRewardBoostMultiplier,
        currentTime
      );
  }

  return {
    points: Math.floor(totalPoints),
    effectiveDuration: usedHours,
    yieldBreakdown: {
      actualOfflineHours,
      maxAllowedHours, // Always the base MAX_YIELD_HOURS
      bonusHours, // Bonus duration in hours
      usedHours, // Actual hours used for calculation
      hasBonusTime
    }
  };
};

async function processYield(telegramId: string, requestType: 'startup' | 'periodic'): Promise<YieldResult> {
  const currentTime = new Date();

  return await prisma.$transaction(async (prisma) => {
    const dbUser = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    const {
      points: pointsToAdd,
      effectiveDuration,
      yieldBreakdown
    } = calculatePoints(
      dbUser.lastUpgradeYieldTimestamp,
      currentTime,
      dbUser.yieldPerHour,
      dbUser.bonusYieldPerHour,
      dbUser.bonusOfflineYieldDuration,
      dbUser.activeOfflineBoostEndTime,
      dbUser.activeOfflineBoostDuration || 0,
      dbUser.activeRewardBoostEndTime,
      dbUser.activeRewardBoostMultiplier || 0,
      requestType === 'startup'
    );

    const streak = dbUser.dailyQuestStreakCount;
    const lastDailyQuestCompletedDate = dbUser.lastDailyQuestCompletedDate;
    let streakMultiplier = 1;

    if (lastDailyQuestCompletedDate) {
      const lastDate = dayjs(lastDailyQuestCompletedDate);
      const now = dayjs();
      const daysSinceLastCompletion = now.diff(lastDate, 'day');

      if (!(daysSinceLastCompletion > 1)) {
        streakMultiplier = 1 + streak * 0.1;
      }
    }

    const finalPointsToAdd = Math.floor(pointsToAdd * streakMultiplier);

    const updatedUser = await prisma.user.update({
      where: { telegramId },
      data: {
        points: { increment: finalPointsToAdd },
        pointsBalance: { increment: finalPointsToAdd },
        lastUpgradeYieldTimestamp: currentTime
      }
    });

    return {
      success: true,
      message: `${requestType === 'startup' ? 'Offline' : 'Periodic'} yield added successfully`,
      points: updatedUser.points,
      lastTimestamp: updatedUser.lastUpgradeYieldTimestamp,
      earnedPoints: finalPointsToAdd,
      effectiveDuration: effectiveDuration,
      yieldBreakdown
    };
  });
}

export async function POST(req: Request) {
  try {
    const { initData: telegramInitData, requestType }: YieldPerHourRequestBody = await req.json();

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

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const result = await processYield(telegramId, requestType);
        return NextResponse.json(result);
      } catch (error) {
        if (error instanceof YieldCalculationError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
          retries++;
          if (retries >= MAX_RETRIES) {
            console.error('Max retries reached for user:', telegramId);
            return NextResponse.json({ error: 'Failed to update user data after multiple attempts' }, { status: 500 });
          }
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
          continue;
        }

        console.error('Error processing yield:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to process yield' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Failed to process yield after max retries' }, { status: 500 });
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }
}
