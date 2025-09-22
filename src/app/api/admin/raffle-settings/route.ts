import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { BIG_REWARD, BIG_REWARD_PLAYERS, SMALL_REWARD, SMALL_REWARD_PLAYERS } from '@/utils/consts';

const RAFFLE_SETTINGS_KEY = 'raffleSettings';
const NEXT_RAFFLE_SETTINGS_KEY = 'nextRaffleSettings';

const DEFAULT_RAFFLE_SETTINGS = {
  bigRewardAmount: BIG_REWARD,
  bigRewardPlayers: BIG_REWARD_PLAYERS,
  smallRewardAmount: SMALL_REWARD,
  smallRewardPlayers: SMALL_REWARD_PLAYERS,
  name: 'Default Raffle Settings',
  updatedAt: new Date().toISOString()
};

export async function GET(req: NextRequest) {
  try {
    const settingsRecord = await prisma.settings.findUnique({
      where: { key: RAFFLE_SETTINGS_KEY }
    });

    if (!settingsRecord) {
      // Create default settings
      const newSettings = await prisma.settings.create({
        data: {
          key: RAFFLE_SETTINGS_KEY,
          value: DEFAULT_RAFFLE_SETTINGS,
          description: 'Settings for raffle prizes and winner counts'
        }
      });

      return NextResponse.json({ settings: newSettings.value });
    }

    return NextResponse.json({ settings: settingsRecord.value });
  } catch (error) {
    console.error('Error fetching raffle settings:', error);
    return NextResponse.json({ error: 'Failed to fetch raffle settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      bigRewardAmount, 
      bigRewardPlayers, 
      smallRewardAmount, 
      smallRewardPlayers, 
      name,
      updateMode = 'immediate'
    } = body;

    if (
      bigRewardAmount === undefined ||
      bigRewardPlayers === undefined ||
      smallRewardAmount === undefined ||
      smallRewardPlayers === undefined
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (bigRewardAmount <= 0 || bigRewardPlayers <= 0 || smallRewardAmount <= 0 || smallRewardPlayers <= 0) {
      return NextResponse.json({ error: 'All values must be positive numbers' }, { status: 400 });
    }

    const newSettings = {
      bigRewardAmount: Number(bigRewardAmount),
      bigRewardPlayers: Number(bigRewardPlayers),
      smallRewardAmount: Number(smallRewardAmount),
      smallRewardPlayers: Number(smallRewardPlayers),
      name: name || 'Raffle Settings',
      updatedAt: new Date().toISOString()
    };

    console.log('newSettings', newSettings);
    console.log('updateMode', updateMode);

    if (updateMode === 'immediate') {
      // Update current settings (affects active raffles immediately)
      const updatedSettings = await prisma.settings.upsert({
        where: { key: RAFFLE_SETTINGS_KEY },
        update: { value: newSettings },
        create: {
          key: RAFFLE_SETTINGS_KEY,
          value: newSettings,
          description: 'Settings for raffle prizes and winner counts'
        }
      });

      // Update active raffles' prizes to match new settings
      const activeRaffles = await prisma.raffle.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { gt: new Date() }
        },
        include: { prizes: true }
      });

      for (const raffle of activeRaffles) {
        // Update existing prizes
        const bigPrize = raffle.prizes.find(p => p.tier === 'BIG');
        const normalPrizes = raffle.prizes.filter(p => p.tier === 'NORMAL');

        if (bigPrize) {
          await prisma.rafflePrize.update({
            where: { id: bigPrize.id },
            data: {
              amount: newSettings.bigRewardAmount,
              winnerCount: newSettings.bigRewardPlayers
            }
          });
        }

        // Update normal prizes (combine into single prize)
        if (normalPrizes.length > 0) {
          // Delete extra normal prizes if any
          if (normalPrizes.length > 1) {
            await prisma.rafflePrize.deleteMany({
              where: {
                id: { in: normalPrizes.slice(1).map(p => p.id) }
              }
            });
          }

          // Update the first normal prize
          await prisma.rafflePrize.update({
            where: { id: normalPrizes[0].id },
            data: {
              amount: newSettings.smallRewardAmount,
              winnerCount: newSettings.smallRewardPlayers
            }
          });
        }
      }

      return NextResponse.json({ 
        success: true, 
        settings: updatedSettings.value,
        message: 'Settings updated immediately for active raffles'
      });

    } else {
      // Save for next raffle only
      const nextRaffleSettings = await prisma.settings.upsert({
        where: { key: NEXT_RAFFLE_SETTINGS_KEY },
        update: { value: newSettings },
        create: {
          key: NEXT_RAFFLE_SETTINGS_KEY,
          value: newSettings,
          description: 'Settings for next raffle prizes and winner counts'
        }
      });

      return NextResponse.json({ 
        success: true, 
        settings: nextRaffleSettings.value,
        message: 'Settings saved for next raffle only'
      });
    }

  } catch (error) {
    console.error('Error updating raffle settings:', error);
    return NextResponse.json({ error: 'Failed to update raffle settings' }, { status: 500 });
  }
}
