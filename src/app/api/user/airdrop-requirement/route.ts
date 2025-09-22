// api/user/airdrop-requirement/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface UpgradeRequestBody {
  initData: string;
}

interface UpgradeResult {
  success: boolean;
  message: string;
  updatedUser?: any;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

export async function POST(req: Request) {
  const requestBody: UpgradeRequestBody = await req.json();
  const { initData: telegramInitData } = requestBody;

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

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const result = await prisma.$transaction<UpgradeResult | null>(async (prisma) => {
        const dbUser = await prisma.user.findUnique({
          where: { telegramId }
        });

        if (!dbUser) {
          throw new Error('User not found');
        }

        // Update user profile data
        const updatedUser = await prisma.user.update({
          where: { telegramId },
          data: {
            isAirdropRequirementMet: true
          }
        });

        return {
          success: true,
          message: 'User upgraded successfully',
          updatedUser
        };
      });

      if (result === null) {
        // User not found during update, possibly due to concurrent modification
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error('Max retries reached for user:', telegramId);
          return NextResponse.json({ error: 'Failed to update user data after multiple attempts' }, { status: 500 });
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
        continue; // Try again
      }

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
        // Optimistic locking failed, retry
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error('Max retries reached for user:', telegramId);
          return NextResponse.json(
            { error: 'Failed to mark airdrop requirement as completed after multiple attempts' },
            { status: 500 }
          );
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
      } else {
        console.error('Error upgrading user:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to mark airdrop requirement as completed' },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json(
    { error: 'Failed to mark airdrop requirement as completed after max retries' },
    { status: 500 }
  );
}
