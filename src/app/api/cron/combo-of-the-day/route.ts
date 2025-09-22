// app/api/cron/combo-of-the-day/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export async function GET(req: NextRequest) {
  try {
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_API_KEY}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Combo-of-the-day cron job started');

    // Define today's start time (UTC midnight)
    // const todayStart = dayjs().utc().startOf('day');
    // const today = todayStart.toDate();
    // const todayEnd = todayStart.endOf('day').toDate();

    // // Check if a combo already exists for today
    // const existing = await prisma.comboOfTheDay.findUnique({
    //   where: { comboDate: today },
    // });

    // if (existing) {
    //   return NextResponse.json({
    //     message: 'Combo for today already exists',
    //     combo: existing,
    //   });
    // }

    // // Fetch all Upgrade IDs
    // const upgrades = await prisma.upgrade.findMany({ select: { id: true } });
    // if (upgrades.length < 3) {
    //   throw new Error('Not enough upgrades in database');
    // }

    // // Pick 3 unique random upgrades
    // const shuffled = upgrades.sort(() => 0.5 - Math.random());
    // const selected = shuffled.slice(0, 3).map((u) => u.id);

    // // Create the combo
    // const newCombo = await prisma.comboOfTheDay.create({
    //   data: {
    //     comboDate: today,
    //     upgradeIds: selected,
    //     createdAt: new Date(),
    //     endsAt: todayEnd,
    //   },
    // });

    // console.log('New combo created:', newCombo);

    return NextResponse.json({
      message: 'Combo-of-the-day card picking completed',
      // combo: newCombo,
    });
  } catch (error) {
    console.error('Error Combo-of-the-day card picking:', error);
    return NextResponse.json(
      { error: 'Failed to create Combo-of-the-day' },
      { status: 500 }
    );
  }
}
