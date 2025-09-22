// app/api/cron/raffle/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { BIG_REWARD, BIG_REWARD_PLAYERS, SMALL_REWARD, SMALL_REWARD_PLAYERS } from '@/utils/consts';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// The key for raffle settings in the Settings table
const RAFFLE_SETTINGS_KEY = 'raffleSettings';

// Define types for our raffle settings
interface RaffleSettingsType {
  bigRewardAmount: number;
  bigRewardPlayers: number;
  smallRewardAmount: number;
  smallRewardPlayers: number;
  name?: string;
  updatedAt?: string;
}

// Default raffle settings
const DEFAULT_RAFFLE_SETTINGS: RaffleSettingsType = {
  bigRewardAmount: BIG_REWARD,
  bigRewardPlayers: BIG_REWARD_PLAYERS,
  smallRewardAmount: SMALL_REWARD,
  smallRewardPlayers: SMALL_REWARD_PLAYERS
};

// Helper function to safely extract settings with proper fallbacks
function extractRaffleSettings(settingsValue: any): RaffleSettingsType {
  if (!settingsValue) return DEFAULT_RAFFLE_SETTINGS;

  return {
    bigRewardAmount: Number(settingsValue.bigRewardAmount) || BIG_REWARD,
    bigRewardPlayers: Number(settingsValue.bigRewardPlayers) || BIG_REWARD_PLAYERS,
    smallRewardAmount: Number(settingsValue.smallRewardAmount) || SMALL_REWARD,
    smallRewardPlayers: Number(settingsValue.smallRewardPlayers) || SMALL_REWARD_PLAYERS,
    name: settingsValue.name || 'Raffle Settings',
    updatedAt: settingsValue.updatedAt || new Date().toISOString()
  };
}

// Helper function to get current raffle settings with fallback to next raffle settings
async function getCurrentRaffleSettings(): Promise<RaffleSettingsType> {
  try {
    // First check for next raffle settings
    const nextRaffleSettingsRecord = await prisma.settings.findUnique({
      where: { key: 'nextRaffleSettings' }
    });

    if (nextRaffleSettingsRecord && nextRaffleSettingsRecord.value) {
      console.log('Using next raffle settings for new raffle');

      // Use next raffle settings and then move them to current settings
      const nextSettings = extractRaffleSettings(nextRaffleSettingsRecord.value);

      // Update current settings with next raffle settings
      await prisma.settings.upsert({
        where: { key: RAFFLE_SETTINGS_KEY },
        update: { value: nextSettings as any },
        create: {
          key: RAFFLE_SETTINGS_KEY,
          value: nextSettings as any,
          description: 'Settings for raffle prizes and winner counts'
        }
      });

      // Delete the next raffle settings since they've been applied
      await prisma.settings.delete({
        where: { key: 'nextRaffleSettings' }
      });

      return nextSettings;
    }

    // Fall back to current settings if no next raffle settings exist
    const currentSettingsRecord = await prisma.settings.findUnique({
      where: { key: RAFFLE_SETTINGS_KEY }
    });

    if (currentSettingsRecord && currentSettingsRecord.value) {
      console.log('Using current raffle settings');
      return extractRaffleSettings(currentSettingsRecord.value);
    }

    // Use defaults if no settings exist
    console.log('Using default raffle settings');
    return DEFAULT_RAFFLE_SETTINGS;
  } catch (error) {
    console.error('Error fetching raffle settings:', error);
    return DEFAULT_RAFFLE_SETTINGS;
  }
}

// This endpoint will be called by external cron service
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Raffle cron job started at', new Date().toISOString());

    // 1. Check for raffles that have ended but are still active
    const endedRaffles = await prisma.raffle.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: new Date() }
      },
      include: {
        entries: true,
        prizes: true
      }
    });

    const results = {
      endedRaffles: endedRaffles.length,
      processedWinners: 0,
      newRaffleCreated: false,
      newRaffleId: '',
      executionTime: 0
    };

    console.log(`📊 Found ${endedRaffles.length} ended raffles to process`);

    // Process ended raffles and select winners
    for (const raffle of endedRaffles) {
      console.log(`🎯 Processing raffle ${raffle.id} (ended: ${raffle.endDate})`);
      const winnersCount = await selectRaffleWinners(raffle);
      results.processedWinners += winnersCount;
      console.log(`✅ Selected ${winnersCount} winners for raffle ${raffle.id}`);
    }

    // 2. Create a new raffle if needed (with duplicate prevention)
    const activeRaffle = await prisma.raffle.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!activeRaffle) {
      console.log('🆕 No active raffle found, creating new one...');

      // Double-check to prevent race conditions
      const doubleCheckRaffle = await prisma.raffle.findFirst({
        where: { status: 'ACTIVE' }
      });

      if (!doubleCheckRaffle) {
        // Get the current raffle settings
        const settings = await getCurrentRaffleSettings();

        // Create a new raffle that lasts for 7 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const newRaffle = await prisma.raffle.create({
          data: {
            startDate,
            endDate,
            status: 'ACTIVE',
            prizes: {
              create: [
                // Big prizes
                {
                  type: 'TON',
                  amount: settings.bigRewardAmount,
                  winnerCount: settings.bigRewardPlayers,
                  tier: 'BIG'
                },
                // Normal prizes
                {
                  type: 'TON',
                  amount: settings.smallRewardAmount,
                  winnerCount: settings.smallRewardPlayers,
                  tier: 'NORMAL'
                }
              ]
            }
          }
        });

        results.newRaffleCreated = true;
        results.newRaffleId = newRaffle.id;
        console.log(`🎉 Created new raffle ${newRaffle.id} (ends: ${endDate.toISOString()})`);
        console.log(
          `💰 Prizes: ${settings.bigRewardPlayers}x${settings.bigRewardAmount} TON (BIG), ${settings.smallRewardPlayers}x${settings.smallRewardAmount} TON (NORMAL)`
        );
      } else {
        console.log('⚠️ Active raffle found during double-check, skipping creation');
      }
    } else {
      console.log(`✅ Active raffle already exists: ${activeRaffle.id} (ends: ${activeRaffle.endDate})`);
    }

    results.executionTime = Date.now() - startTime;
    console.log(`🏁 Raffle cron job completed in ${results.executionTime}ms`);

    return NextResponse.json(results);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Error in raffle cron job:', error);
    console.error(`💥 Failed after ${executionTime}ms`);

    return NextResponse.json(
      {
        error: 'Failed to process raffle cron job',
        executionTime,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function selectRaffleWinners(raffle: any) {
  try {
    // Prepare all tickets based on entries - more tickets = higher chances of winning
    const allTickets: { userId: string; entryId: string }[] = [];

    raffle.entries.forEach((entry: any) => {
      // Each ticket adds one entry to the drawing pool
      for (let i = 0; i < entry.ticketCount; i++) {
        allTickets.push({
          userId: entry.userId,
          entryId: entry.id
        });
      }
    });

    // If no entries, mark as finished without winners
    if (allTickets.length === 0) {
      await prisma.raffle.update({
        where: { id: raffle.id },
        data: { status: 'FINISHED' }
      });
      return 0;
    }

    // Shuffle the tickets array using Fisher-Yates algorithm
    for (let i = allTickets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTickets[i], allTickets[j]] = [allTickets[j], allTickets[i]];
    }

    // Group prizes by tier
    const bigPrizes = raffle.prizes.filter((prize: any) => prize.tier === 'BIG');
    const normalPrizes = raffle.prizes.filter((prize: any) => prize.tier === 'NORMAL' || !prize.tier);

    // Keep track of users who already won to avoid duplicates
    const winnerUserIds = new Set<string>();

    // Process BIG prizes first
    const bigWinnersCount = await assignWinners(bigPrizes, allTickets, winnerUserIds, raffle.id);

    // Then process NORMAL prizes
    const normalWinnersCount = await assignWinners(normalPrizes, allTickets, winnerUserIds, raffle.id);

    // Log winner info for admin notification
    console.log(
      `Raffle ${raffle.id} has ${bigWinnersCount + normalWinnersCount} winners. Admin should check the dashboard.`
    );

    // Mark raffle as finished
    await prisma.raffle.update({
      where: { id: raffle.id },
      data: { status: 'FINISHED' }
    });

    return bigWinnersCount + normalWinnersCount;
  } catch (error) {
    console.error(`Error selecting winners for raffle ${raffle.id}:`, error);
    throw error;
  }
}

async function assignWinners(
  prizes: any[],
  allTickets: { userId: string; entryId: string }[],
  winnerUserIds: Set<string>,
  raffleId: string
) {
  let totalWinners = 0;

  for (const prize of prizes) {
    const winnerCount = prize.winnerCount || 1;
    const prizeWinners: string[] = [];

    // Find unique winners for this prize
    for (let i = 0; i < allTickets.length && prizeWinners.length < winnerCount; i++) {
      const userId = allTickets[i].userId;

      // Skip users who already won
      if (!winnerUserIds.has(userId)) {
        prizeWinners.push(userId);
        winnerUserIds.add(userId);
        totalWinners++;

        // Create winner record
        await prisma.raffleWinner.create({
          data: {
            userId: userId,
            raffleId: raffleId,
            prizeId: prize.id,
            claimed: true // Mark as claimed since it's automatically added to balance
          }
        });

        // Handle prize distribution
        if (prize.type === 'TON') {
          // Get current user to handle null tonBalance case
          const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { tonBalance: true }
          });

          const currentBalance = currentUser?.tonBalance ?? 0;

          // Add TON prize to user's balance
          await prisma.user.update({
            where: { id: userId },
            data: {
              tonBalance: currentBalance + prize.amount
            }
          });
        }
      }
    }
  }

  return totalWinners;
}
