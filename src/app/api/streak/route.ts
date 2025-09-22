import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { addDays, isSameDay } from 'date-fns';

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

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!dbUser) {
        throw new Error('User not found');
      }

      function getQuestDay(date: Date): Date {
        const normalized = new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          10, 0, 0
        ));
        return date.getTime() < normalized.getTime()
          ? addDays(normalized, -1)
          : normalized;
      }

      const today = new Date();
      const lastCompleted = dbUser.lastDailyQuestCompletedDate;
      let newStreak = dbUser.dailyQuestStreakCount;

      if (!lastCompleted || getQuestDay(today).getTime() !== getQuestDay(lastCompleted).getTime()) {
        newStreak =
          lastCompleted &&
            getQuestDay(today).getTime() === getQuestDay(addDays(lastCompleted, 1)).getTime()
            ? dbUser.dailyQuestStreakCount
            : 0;
      }

      if (dbUser.totalStars < 170) {
        return {
          success: false,
          message: 'Not enough stars to activate shield.'
        };
      }

      await prisma.user.update({
        where: { telegramId },
        data: {
          lastDailyQuestCompletedDate: today,
          dailyQuestStreakCount: newStreak,
          totalStars: dbUser.totalStars - 170,
          isSheildActive: true,
        }
      });
      const updatedUser: any = await prisma.user.findUnique({
        where: { telegramId }
      });

      return {
        success: true,
        message: 'Shield activated and streak preserved.',
        dailyQuestStreakCount: updatedUser.dailyQuestStreakCount,
        lastDailyQuestCompletedDate: updatedUser.lastDailyQuestCompletedDate,
        isSheildActive: updatedUser.isSheildActive,
        totalStars: updatedUser.totalStars
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}