// app/api/raffle/entry/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { RAFFLE_TICKETS } from '@/utils/consts';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateYieldPerHour } from '@/utils/calculations';

interface RaffleEntryRequestBody {
  initData: string;
  tier: number;
}

export async function POST(req: NextRequest) {
  try {
    const requestBody: RaffleEntryRequestBody = await req.json();
    const { initData: telegramInitData, tier } = requestBody;

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

    // Find the user
    const dbUser = await prisma.user.findUnique({
      where: { telegramId }
    });
    console.log('dbUser:', dbUser);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const yieldPerHour = calculateYieldPerHour(dbUser.bonusYieldPerHour || 0, dbUser.yieldPerHour || 0);

    // Check if the user has enough points to claim the tier
    if (!yieldPerHour) {
      return NextResponse.json({ error: 'Not enough points to claim this tier' }, { status: 400 });
    }

    // Get the current active raffle
    const activeRaffle = await prisma.raffle.findFirst({
      where: {
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      }
    });

    if (!activeRaffle) {
      return NextResponse.json({ error: 'No active raffle found' }, { status: 404 });
    }

    // Find user's claimed tiers for this raffle
    const userClaimedTiers = await prisma.raffleClaimedTier.findMany({
      where: {
        userId: dbUser.id,
        raffleId: activeRaffle.id
      }
    });

    // Check if the tier is already claimed
    const isTierClaimed = userClaimedTiers.some((claimedTier) => claimedTier.tier === tier);

    if (isTierClaimed) {
      return NextResponse.json({ error: 'This tier has already been claimed' }, { status: 400 });
    }

    // Check if user is eligible for the tier based on points
    if (tier >= 0 && tier < RAFFLE_TICKETS.length) {
      const requiredPoints = RAFFLE_TICKETS[tier].yield;

      if (yieldPerHour < requiredPoints) {
        return NextResponse.json({ error: 'Not enough points to claim this tier' }, { status: 400 });
      }

      // Get tickets for this tier
      const ticketsToAdd = RAFFLE_TICKETS[tier].tickets;

      // Add entry to the raffle
      const raffleEntry = await prisma.raffleEntry.create({
        data: {
          userId: dbUser.id,
          raffleId: activeRaffle.id,
          ticketCount: ticketsToAdd
        }
      });

      // Record that this tier has been claimed
      await prisma.raffleClaimedTier.create({
        data: {
          userId: dbUser.id,
          raffleId: activeRaffle.id,
          tier: tier
        }
      });

      return NextResponse.json({
        success: true,
        ticketsAdded: ticketsToAdd,
        tier: tier,
        entry: raffleEntry
      });
    } else {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error adding raffle entry:', error);
    return NextResponse.json({ error: 'Failed to add raffle entry' }, { status: 500 });
  }
}
