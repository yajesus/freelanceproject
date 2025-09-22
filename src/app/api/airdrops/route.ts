// app/api/airdrops/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import dayjs from 'dayjs';

const LIMIT = 100;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const telegramInitData = url.searchParams.get('initData');
  const date = url.searchParams.get('date') || new Date().toISOString();

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

  try {
    // Fetch the user
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const convertedDate = dayjs(date).format('YYYY-MM-DD');

    const startOfDay = new Date(`${convertedDate}T00:00:00.000Z`); // Start of the day
    const endOfDay = new Date(`${convertedDate}T23:59:59.999Z`); // End of the day

    // Fetch Airdrops entries
    const [airdrops, count] = await Promise.all([
      prisma.userAirdrop.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        take: LIMIT,
        include: {
          user: {
            include: {
              inventory: true
            }
          }
        },
        orderBy: {
          price: 'desc'
        }
      }),
      prisma.userAirdrop.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        take: LIMIT
      })
    ]);

    return NextResponse.json({
      data: airdrops.map((airdrop) => ({
        player: airdrop.user ? airdrop.user.name : airdrop.username,
        won: {
          price: +airdrop.price.toFixed(2),
          priceInTon: +airdrop.priceInTon.toFixed(2)
        },
        profile: airdrop?.equippedAvatar ? airdrop.equippedAvatar : airdrop.user?.inventory?.equippedAvatarName || '',
        telegramId: airdrop.user?.telegramId || null
      })),
      count
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Vary': 'date' // Vary the cache based on the date parameter
      }
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch user tasks' }, { status: 500 });
  }
}
