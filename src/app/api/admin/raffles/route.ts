import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET(req: NextRequest) {
  try {
    // Fetch all raffles with their prizes, entries, and winners
    const raffles = await prisma.raffle.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        prizes: true,
        entries: {
          include: {
            user: {
              select: {
                name: true,
                telegramId: true
              }
            }
          }
        },
        winners: {
          include: {
            user: {
              select: {
                name: true,
                telegramId: true,
                tonWalletAddress: true,
                inventory: {
                  select: {
                    equippedAvatarName: true
                  }
                }
              }
            },
            prize: {
              select: {
                amount: true,
                type: true,
                tier: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, raffles });
  } catch (error) {
    console.error('Error fetching raffles:', error);
    return NextResponse.json({ error: 'Failed to fetch raffles' }, { status: 500 });
  }
} 