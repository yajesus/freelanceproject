// app/api/raffle/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { RAFFLE_TICKETS } from '@/utils/consts';
import { validateTelegramWebAppData } from '@/utils/server-checks';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/raffle - Get current active raffle and previous raffle with winners
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'current';
    const initData = searchParams.get('initData');

    if (!initData) {
      return NextResponse.json({ error: 'Telegram initData is required' }, { status: 400 });
    }

    // Validate the Telegram Web App data
    const { validatedData, user } = validateTelegramWebAppData(initData);

    if (!validatedData || !user) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();

    // Find the user
    const dbUser = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (type === 'current') {
      // Get the current active raffle
      const currentRaffle = await prisma.raffle.findFirst({
        where: {
          status: 'ACTIVE',
          endDate: { gt: new Date() }
        },
        include: {
          prizes: true,
          entries: {
            where: { userId: dbUser.id }
          }
        }
      });

      if (!currentRaffle) {
        // Return success response with no raffle instead of error
        return NextResponse.json(
          {
            raffle: null,
            userEntries: 0,
            totalEntries: 0,
            timeRemaining: 0,
            prizes: { big: [], normal: [] },
            claimedTiers: [],
            noActiveRaffle: true
          },
          { status: 200 }
        );
      }

      // Get user's claimed tiers for this raffle
      const claimedTiers = await prisma.raffleClaimedTier.findMany({
        where: {
          userId: dbUser.id,
          raffleId: currentRaffle.id
        }
      });

      // Format claimed tiers as an array that matches RAFFLE_TICKETS
      const formattedClaimedTiers = RAFFLE_TICKETS.map((_, index) => ({
        tier: index,
        claimed: claimedTiers.some((t) => t.tier === index)
      }));

      // Get total entries count for the raffle
      const totalEntries = await prisma.raffleEntry.aggregate({
        where: { raffleId: currentRaffle.id },
        _sum: { ticketCount: true }
      });

      // Group prizes by tier
      const bigPrizes = currentRaffle.prizes.filter((prize) => prize.tier === 'BIG');
      const normalPrizes = currentRaffle.prizes.filter((prize) => prize.tier === 'NORMAL' || !prize.tier);

      return NextResponse.json({
        raffle: currentRaffle,
        userEntries: currentRaffle.entries.reduce((sum, entry) => sum + entry.ticketCount, 0),
        totalEntries: totalEntries._sum.ticketCount || 0,
        timeRemaining: currentRaffle.endDate.getTime() - Date.now(),
        prizes: {
          big: bigPrizes,
          normal: normalPrizes
        },
        claimedTiers: formattedClaimedTiers,
        noActiveRaffle: false
      });
    } else {
      // Get the most recent finished raffle
      const previousRaffle = await prisma.raffle.findFirst({
        where: { status: 'FINISHED' },
        orderBy: { endDate: 'desc' },
        include: {
          prizes: true,
          winners: {
            include: {
              prize: true,
              user: {
                select: {
                  telegramId: true,
                  name: true,
                  inventory: {
                    select: {
                      equippedAvatarName: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!previousRaffle) {
        return NextResponse.json({ error: 'No previous raffle found' }, { status: 404 });
      }

      return NextResponse.json({
        raffle: previousRaffle,
        winners: previousRaffle.winners
      });
    }
  } catch (error) {
    console.error('Error fetching raffles:', error);
    return NextResponse.json({ error: 'Failed to fetch raffles' }, { status: 500 });
  }
}
