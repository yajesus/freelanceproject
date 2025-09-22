// app/api/rewards/claim/route.ts

import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { validateTelegramWebAppData } from "@/utils/server-checks";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  DAILY_REWARDS_BASE,
  DAILY_REWARDS_COEFFICIENT_BASE,
  DAILY_REWARDS_COEFFICIENT_PREMIUM,
} from "@/utils/consts";

interface ClaimRewardResult {
  lastClaimRewardTimestamp: Date;
  currentDay: number;
  rewardAmount: number;
}

const calculateReward = (day: number, upgradeYieldPerHour: number): number => {
  let baseReward = DAILY_REWARDS_BASE;
  for (let i = 1; i < day; i++) {
    baseReward =
      Math.floor(
        baseReward *
          (i <= 30
            ? DAILY_REWARDS_COEFFICIENT_BASE
            : DAILY_REWARDS_COEFFICIENT_PREMIUM)
      ) + upgradeYieldPerHour;
  }
  return baseReward;
};

const getFriendsRequired = (day: number): number => {
  if (day < 15) return 0;
  if (day <= 30) return day - 14;
  if (day <= 40) return 15 + (day - 30) * 2;
  if (day <= 59) return 35 + (day - 40) * 3;
  return 100;
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

export async function POST(req: Request) {
  const { initData: telegramInitData } = await req.json();

  if (!telegramInitData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

  if (!validatedData) {
    return NextResponse.json(
      { error: "Invalid Telegram data" },
      { status: 403 }
    );
  }

  const telegramId = user.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const result = await prisma.$transaction<ClaimRewardResult | null>(
        async (prisma) => {
          const dbUser = await prisma.user.findUnique({
            where: { telegramId },
            include: {
              referrals: true,
            },
          });

          if (!dbUser) {
            throw new Error("User not found");
          }

          const currentTime = new Date();
          const lastClaimTime = dbUser.lastClaimRewardTimestamp;

          // Only check 24-hour cooldown if user has already claimed at least one reward
          if (dbUser.lastClaimRewardDay && dbUser.lastClaimRewardDay >= 1) {
            if (
              lastClaimTime &&
              currentTime.getTime() - lastClaimTime.getTime() <
                24 * 60 * 60 * 1000
            ) {
              throw new Error("Reward can only be claimed once every 24 hours");
            }
          }

          // Calculate next day and check referral requirements
          const nextDay = (dbUser.lastClaimRewardDay || 0) + 1;
          const requiredFriends = getFriendsRequired(nextDay);
          const currentFriends =
            dbUser.referrals.length + (dbUser.fakeFriends ?? 0);

          if (requiredFriends > currentFriends) {
            throw new Error(
              `You need ${requiredFriends} friends to claim day ${nextDay} reward. Current friends: ${currentFriends}`
            );
          }

          // Calculate the reward amount server-side
          const rewardAmount = calculateReward(
            nextDay,
            dbUser.yieldPerHour || 0
          );

          const updatedUser = await prisma.user.update({
            where: {
              telegramId,
              lastClaimRewardTimestamp: dbUser.lastClaimRewardTimestamp, // Optimistic lock
            },
            data: {
              points: { increment: rewardAmount },
              pointsBalance: { increment: rewardAmount },
              lastClaimRewardTimestamp: currentTime,
              lastClaimRewardDay: nextDay,
            },
          });

          if (!updatedUser) {
            return null;
          }

          return {
            lastClaimRewardTimestamp: updatedUser.lastClaimRewardTimestamp,
            currentDay: updatedUser.lastClaimRewardDay,
            rewardAmount,
          };
        }
      );

      if (result === null) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error("Max retries reached for user:", telegramId);
          return NextResponse.json(
            { error: "Failed to claim reward after multiple attempts" },
            { status: 500 }
          );
        }
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))
        );
        continue;
      }

      return NextResponse.json({
        success: true,
        lastClaimRewardTimestamp: result.lastClaimRewardTimestamp,
        currentDay: result.currentDay,
        rewardAmount: result.rewardAmount,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error("Max retries reached for user:", telegramId);
          return NextResponse.json(
            { error: "Failed to claim reward after multiple attempts" },
            { status: 500 }
          );
        }
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))
        );
      } else {
        console.error("Error Claiming Reward:", error);
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Failed to claim Reward",
          },
          { status: 400 }
        );
      }
    }
  }

  return NextResponse.json(
    { error: "Failed to claim Reward" },
    { status: 500 }
  );
}
