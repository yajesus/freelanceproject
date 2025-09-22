import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateYieldPerHour } from '@/utils/calculations';

export async function POST(req: Request) {
  const { initData: telegramInitData, twitterShare } = await req.json();

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

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!dbUser) {
        throw new Error('User not found');
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const combo = await prisma.comboOfTheDay.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!combo) {
        return NextResponse.json(
          { error: 'No combo found for today' },
          { status: 404 }
        );
      }

      await prisma.userComboProgress.upsert({
        where: {
          userId_comboDate: {
            userId: dbUser.id,
            comboDate: combo.comboDate
          }
        },
        update: {
          rewardClaimed: true,
          sharedOnX: twitterShare || false
        },
        create: {
          userId: dbUser.id,
          comboDate: today,
          discoveredIds: [],
          rewardClaimed: true,
          sharedOnX: twitterShare || false
        }
      });

      const rewardStars = twitterShare ? 20 : 10;
      const rewardMultiplier = 10 * (twitterShare ? 2 : 1);

      const pointsReward = (rewardMultiplier * dbUser.yieldPerHour);

      const updatedUser = await prisma.user.update({
        where: { telegramId },
        data: {
          earnedStars: dbUser.earnedStars + rewardStars,
          totalStars: dbUser.totalStars + rewardStars,
          points: dbUser.points + pointsReward,
          pointsBalance: dbUser.pointsBalance + pointsReward,
        }
      });

      return {
        success: true,
        message: 'Daily quest updated successfully.',
        totalStars: updatedUser.totalStars,
        yieldPerHour: updatedUser.yieldPerHour,
        points: updatedUser.points
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating daily quest:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}