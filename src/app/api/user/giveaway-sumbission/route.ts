// app/api/user/giveaway-sumbission/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { DAILY_SUBMISSIONS_LIMIT } from '@/utils/consts';

interface SubmissionRequestBody {
  initData: string;
  link: string;
}

interface SubmissionResult {
  success: boolean;
  message: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

export async function POST(req: Request) {
  const requestBody: SubmissionRequestBody = await req.json();
  const { initData: telegramInitData, link } = requestBody;

  if (!telegramInitData || !link) {
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
      const result = await prisma.$transaction<SubmissionResult | null>(async (prisma) => {
        const dbUser = await prisma.user.findUnique({
          where: { telegramId },
          include: {
            giveawaySubmissions: {
              where: {
                createdAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)) // Start of current day
                }
              }
            }
          }
        });

        if (!dbUser) {
          throw new Error('User not found');
        }

        // Check if user has reached daily submission limit
        if (dbUser.giveawaySubmissions.length >= DAILY_SUBMISSIONS_LIMIT) {
          throw new Error(`Daily submission limit of ${DAILY_SUBMISSIONS_LIMIT} links reached`);
        }

        // Add new submission
        await prisma.giveawaySubmission.create({
          data: {
            link,
            userId: dbUser.id
          }
        });

        return {
          success: true,
          message: 'Submission added successfully'
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
        console.error('Error upgrading user:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to update user' },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ error: 'Failed to update user after max retries' }, { status: 500 });
}
