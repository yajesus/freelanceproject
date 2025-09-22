// app/api/upgrade/skill/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  calculateLevelIndex,
  calculateSkillUpgradeBenefit,
  calculateSkillUpgradeCost,
  calculateSkillUpgradeTime
} from '@/utils/game-mechanics';
import { LEVELS } from '@/utils/consts';
import { calculateYieldPerHour } from '@/utils/calculations';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

interface UpgradeSkillRequestBody {
  initData: string;
  upgradeId: string;
}

interface UpgradeResult {
  success: boolean;
  message: string;
  updatedUserUpgrade: any;
  updatedUser: any;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

async function checkComboProgress(dbUser: any, upgradeId: string) {

  // Fetch today’s combo
  const comboOfTheDay = await prisma.comboOfTheDay.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
  });

  let comboHit = false;
  let comboCompleted = false;
  let discoveredCardImage = null;
  let comboImages: any = [];

  if (comboOfTheDay && comboOfTheDay.upgradeIds.includes(upgradeId)) {
    comboHit = true;

    const existingProgress = await prisma.userComboProgress.findUnique({
      where: {
        userId_comboDate: {
          userId: dbUser.id,
          comboDate: comboOfTheDay.comboDate,
        },
      },
    });

    const newDiscoveredIds = existingProgress
      ? Array.from(new Set([...existingProgress.discoveredIds, upgradeId]))
      : [upgradeId];

    const progress = existingProgress
      ? await prisma.userComboProgress.update({
        where: {
          userId_comboDate: {
            userId: dbUser.id,
            comboDate: comboOfTheDay.comboDate,
          },
        },
        data: {
          discoveredIds: newDiscoveredIds,
        },
      })
      : await prisma.userComboProgress.create({
        data: {
          userId: dbUser.id,
          comboDate: comboOfTheDay.comboDate,
          discoveredIds: newDiscoveredIds,
        },
      });

    comboCompleted = newDiscoveredIds.length === 3;

    const upgrades = await prisma.upgrade.findMany({
      where: { id: { in: comboOfTheDay.upgradeIds } },
      select: { id: true, image: true },
    });

    discoveredCardImage = upgrades.find(u => u.id === upgradeId)?.image || null;
    comboImages = upgrades.map(u => u.image);
  }

  return {
    comboHit,
    comboCompleted,
    discoveredCardImage,
    comboImages,
  };
}

export async function POST(req: Request) {
  const requestBody: UpgradeSkillRequestBody = await req.json();
  const { initData: telegramInitData, upgradeId } = requestBody;
  console.log('REQ payload =>', upgradeId);

  if (!telegramInitData || !upgradeId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { validatedData, user: telegramUser } = validateTelegramWebAppData(telegramInitData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = telegramUser.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const result = await prisma.$transaction<UpgradeResult | null>(async (prisma) => {
        const dbUser = await prisma.user.findUnique({
          where: { telegramId },
          include: {
            referredBy: true,
            userUpgrades: {
              where: { upgradeId }
            }
          }
        });

        if (!dbUser) {
          throw new Error('User not found');
        }

        const userUpgrade = dbUser.userUpgrades[0];

        if (userUpgrade?.cooldownEndsAt && userUpgrade.cooldownEndsAt > new Date()) {
          throw new Error('Upgrade is in cooldown');
        }

        const currentLevel = userUpgrade?.level ?? 0;
        const upgrade = await prisma.upgrade.findUnique({ where: { id: upgradeId } });

        if (!upgrade) {
          throw new Error('Upgrade not found');
        }

        // Check if this is a specials upgrade that has expired
        if (upgrade.isSpecial && upgrade.countdownEndsAt) {
          const now = dayjs();
          const countdownEnd = dayjs(upgrade.countdownEndsAt);

          if (countdownEnd.isBefore(now) || countdownEnd.isSame(now)){
            // Check if user has already purchased this upgrade
            if (currentLevel === 0) {
              throw new Error('This special upgrade has expired and is no longer available');
            }
          }
        }

        const upgradeCost = calculateSkillUpgradeCost(currentLevel, upgrade.baseCost);
        const nextUpgradePoints = calculateSkillUpgradeBenefit(currentLevel, upgrade.basePoints);

        if (dbUser.points < upgradeCost || dbUser.pointsBalance < upgradeCost) {
          throw new Error('Insufficient points for upgrade');
        }

        const cooldownTime = calculateSkillUpgradeTime(currentLevel);
        const cooldownEndsAt = dayjs().add(cooldownTime, 'seconds').toDate();
        const newYield = calculateYieldPerHour(dbUser.bonusYieldPerHour ?? 0, dbUser.yieldPerHour + nextUpgradePoints);
        const oldYield = calculateYieldPerHour(dbUser.bonusYieldPerHour ?? 0, dbUser.yieldPerHour);
        const newLevelIndex = calculateLevelIndex(newYield);
        const oldLevelIndex = calculateLevelIndex(oldYield);

        const isPremium = telegramUser?.is_premium || false;

        // Calculate additional referral points if user leveled up
        let additionalReferralPoints = 0;
        if (newLevelIndex > oldLevelIndex) {
          for (let i = oldLevelIndex + 1; i <= newLevelIndex; i++) {
            additionalReferralPoints += isPremium ? LEVELS[i].friendBonusPremium : LEVELS[i].friendBonus;
          }
        }

        const updatedUserUpgrade = await prisma.userUpgrade.upsert({
          where: { userId_upgradeId: { userId: dbUser.id, upgradeId } },
          update: {
            level: currentLevel + 1,
            acquiredAt: new Date(),
            cooldownEndsAt
          },
          create: {
            userId: dbUser.id,
            upgradeId,
            level: 1,
            acquiredAt: new Date(),
            cooldownEndsAt: cooldownEndsAt
          }
        });

        // Update user's hourlyProfit
        const updatedUser = await prisma.user.update({
          where: {
            telegramId
          },
          data: {
            points: { decrement: upgradeCost },
            pointsBalance: { decrement: upgradeCost },
            yieldPerHour: { increment: nextUpgradePoints },
            referralPointsEarned: { increment: additionalReferralPoints }
          }
        });

        // Update referrer's points if user leveled up
        if (additionalReferralPoints > 0 && dbUser.referredBy) {
          await prisma.user.update({
            where: { id: dbUser.referredBy.id },
            data: {
              points: { increment: additionalReferralPoints },
              pointsBalance: { increment: additionalReferralPoints }
            }
          });
        }

        const {
          comboHit,
          comboCompleted,
          discoveredCardImage,
          comboImages
        } = await checkComboProgress(dbUser, upgradeId);
        if (comboHit) {
          await prisma.user.update({
            where: { telegramId },
            data: {
              earnedStars: dbUser.earnedStars + 10,
              totalStars: dbUser.totalStars + 10,
            }
          });
        }
        return {
          success: true,
          message: 'Skill Upgrade successful',
          updatedUserUpgrade,
          updatedUser,
          upgradeCost,
          upgradeYield: nextUpgradePoints,
          comboHit,
          comboCompleted,
          discoveredCardImage,
          comboImages,
        };
      }, {
        maxWait: 10000, // Wait up to 10s to acquire connection
        timeout: 10000  // Allow up to 10s for the transaction to finish
      });

      if (result === null) {
        // User not found during update, possibly due to concurrent modification
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error('Max retries reached for user:', telegramId);
          return NextResponse.json({ error: 'Failed to update user data after multiple attempts' }, { status: 500 });
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
        continue; // Try again
      }

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      } else if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
        // Optimistic locking failed, retry
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error('Max retries reached for user:', telegramId);
          return NextResponse.json({ error: 'Failed to update user data after multiple attempts' }, { status: 500 });
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
      } else {
        console.error('Error upgrading skill:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to upgrade skill' },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ error: 'Failed to upgrade skill after max retries' }, { status: 500 });
}

export async function GET() {
  const upgrades = await prisma.upgrade.findMany();
  return NextResponse.json({ upgrades });
}
