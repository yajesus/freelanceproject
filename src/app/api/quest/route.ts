import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { addDays, isSameDay } from 'date-fns';
import { validateTelegramWebAppData } from '@/utils/server-checks';

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

      function getQuestDay(date: Date): Date {
        const questStart = new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          10, 0, 0 // 10 AM UTC
        ));

        return date.getTime() < questStart.getTime()
          ? addDays(questStart, -1)
          : questStart;
      }


      if (!dbUser) {
        throw new Error('User not found');
      }

      const today = new Date();
      const todayQuestDay = getQuestDay(today);
      const lastCompleted = dbUser.lastDailyQuestCompletedDate;
      const lastClaimed = dbUser.lastStreakClaim;
      const lastQuestDay: any = lastCompleted ? getQuestDay(lastCompleted) : null;
      const lastStreakClaimDay: any = lastClaimed ? getQuestDay(lastClaimed) : null;

      let updatedUser;
      let missedDay = lastCompleted && !isSameDay(addDays(lastCompleted, 1), today);

      if (!lastCompleted || lastStreakClaimDay == null || todayQuestDay.getTime() !== lastStreakClaimDay.getTime()) {
        const continuedStreak =
          lastCompleted &&
          (
            todayQuestDay.getTime() === getQuestDay(addDays(lastCompleted, 1)).getTime() ||
            todayQuestDay.getTime() === getQuestDay(lastCompleted).getTime()
          );

        const newStreak = continuedStreak ? dbUser.dailyQuestStreakCount + 1 : 1;
        missedDay = lastCompleted && !continuedStreak;

        const rewardPoints = Math.floor((dbUser.yieldPerHour * 120) / 2);

        updatedUser = await prisma.user.update({
          where: { telegramId },
          data: {
            points: dbUser.points + rewardPoints,
            pointsBalance: dbUser.points + rewardPoints,
            dailyQuestStreakCount: newStreak,
            lastDailyQuestCompletedDate: today,
            lastStreakClaim: today,
            earnedStars: dbUser.earnedStars + 25,
            totalStars: dbUser.totalStars + 25,
            isSheildActive: missedDay ? false : dbUser.isSheildActive,
            // yieldPerHour: dbUser.yieldPerHour * streakMultiplier
          }
        });
      } else {
        return {
          success: false,
          message: 'Daily quest already completed today.',
          dailyQuestStreakCount: dbUser.dailyQuestStreakCount,
          lastDailyQuestCompletedDate: dbUser.lastDailyQuestCompletedDate,
          setLastStreakClaim: dbUser.lastStreakClaim,
          isSheildActive: dbUser.isSheildActive,
          totalStars: dbUser.totalStars,
        };
      }

      return {
        success: true,
        message: 'Daily quest updated successfully.',
        dailyQuestStreakCount: updatedUser.dailyQuestStreakCount,
        lastDailyQuestCompletedDate: updatedUser.lastDailyQuestCompletedDate,
        setLastStreakClaim: dbUser.lastStreakClaim,
        isSheildActive: updatedUser.isSheildActive,
        totalStars: updatedUser.totalStars,
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