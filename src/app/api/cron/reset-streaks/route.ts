// app/api/cron/reset-streaks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  try {
    // Authorization check
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_API_KEY}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Reset streaks cron job started');

    const today = dayjs().startOf('day').toDate();

    const usersWithStreaks = await prisma.user.findMany({
      where: {
        dailyQuestStreakCount: { gt: 0 },
        lastDailyQuestCompletedDate: { 
          lt: today,
          not: dayjs(today).subtract(1, 'day').toDate()
        }
      }
    });

    console.log(`Found ${usersWithStreaks.length} users to reset streaks`);

    // const resetResults = await prisma.user.updateMany({
    //   where: {
    //     id: { in: usersWithStreaks.map(u => u.id) }
    //   },
    //   data: {
    //     dailyQuestStreakCount: 0
    //   }
    // });

    // console.log(`Reset streaks for ${resetResults.count} users`);

    return NextResponse.json({
      message: 'Streak reset completed',
      // usersAffected: resetResults.count
    });
  } catch (error) {
    console.error('Error resetting streaks:', error);
    return NextResponse.json(
      { error: 'Failed to reset streaks' },
      { status: 500 }
    );
  }
}