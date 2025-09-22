// api/user/profile/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { getTwitterUserId } from '@/utils/twitter';

interface UpgradeRequestBody {
  initData: string;
  twitterHandle?: string;
  erc20Wallet?: string;
}

interface UserUpdateData {
  twitterHandle?: string;
  twitterId?: string;
  erc20Wallet?: string;
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
  const { initData: telegramInitData, ...profileData } = requestBody;
  console.log('REQ payload =>', profileData, Object.keys(profileData));

  if (!telegramInitData || Object.keys(profileData).length === 0) {
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

        // Check for unique constraints on twitterHandle and erc20Wallet
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ twitterHandle: profileData.twitterHandle }, { erc20Wallet: profileData.erc20Wallet }],
            NOT: { telegramId } // Exclude the current user
          }
        });

        if (existingUser) {
          throw new Error('Twitter handle or ERC-20 wallet already in use');
        }

        const updateData: UserUpdateData = { ...profileData };

        if (profileData.twitterHandle) {
          const twitterHandle = profileData.twitterHandle.replace(/^@/, '');
          const twitterId = await getTwitterUserId(twitterHandle);

          if (!twitterId) {
            throw new Error('Invalid Twitter handle');
          }

          updateData.twitterId = twitterId;
        }

        // Update user profile data
        const updatedUser = await prisma.user.update({
          where: { telegramId },
          data: updateData
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
          return NextResponse.json({ error: 'Failed to update user data after multiple attempts' }, { status: 500 });
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
      } else {
        console.error('Error upgrading user info:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to update user' },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ error: 'Failed to update user after max retries' }, { status: 500 });
}
