// app/api/user/token-holding/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const envSchema = z.object({
  ETHERSCAN_API_KEY: z.string().min(1),
  TOKEN_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  ETHERSCAN_API_HOLDER_CHECK_RETENTION: z.string().regex(/^\d+$/).default('48')
});

const requestSchema = z.object({
  initData: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

interface EtherscanResponse {
  status: string;
  message: string;
  result: string;
}

// Token amounts in smallest unit (raw amount)
const HOLDER_LEVELS = {
  LEVEL_1: BigInt('500000' + '0'.repeat(18)), // 500K
  LEVEL_2: BigInt('1000000' + '0'.repeat(18)), // 1M
  LEVEL_3: BigInt('5000000' + '0'.repeat(18)), // 5M
  LEVEL_4: BigInt('25000000' + '0'.repeat(18)), // 25M
  LEVEL_5: BigInt('50000000' + '0'.repeat(18)) // 50M
} as const;

function calculateHolderLevel(balance: bigint): number {
  if (balance >= HOLDER_LEVELS.LEVEL_5) return 5;
  if (balance >= HOLDER_LEVELS.LEVEL_4) return 4;
  if (balance >= HOLDER_LEVELS.LEVEL_3) return 3;
  if (balance >= HOLDER_LEVELS.LEVEL_2) return 2;
  if (balance >= HOLDER_LEVELS.LEVEL_1) return 1;
  return 0;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 100;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache implementation
const holdingsCache = new Map<
  string,
  {
    timestamp: number;
    level: number;
  }
>();

async function checkTokenHoldings(address: string, env: z.infer<typeof envSchema>): Promise<number> {
  const cached = holdingsCache.get(address);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.level;
  }

  const url = new URL('https://api.etherscan.io/api');
  url.searchParams.append('module', 'account');
  url.searchParams.append('action', 'tokenbalance');
  url.searchParams.append('contractaddress', env.TOKEN_CONTRACT_ADDRESS);
  url.searchParams.append('address', address);
  url.searchParams.append('tag', 'latest');
  url.searchParams.append('apikey', env.ETHERSCAN_API_KEY);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: EtherscanResponse = await response.json();
  console.log('Etherscan response:', data);

  if (data.status === '1') {
    const balance = BigInt(data.result);
    const level = calculateHolderLevel(balance);

    holdingsCache.set(address, {
      timestamp: now,
      level
    });

    return level;
  }

  if (data.status === '0') {
    throw new Error(`Etherscan API error: ${data.message}`);
  }

  return 0;
}

async function shouldCheckTokens(lastCheck: Date | null, env: z.infer<typeof envSchema>): Promise<boolean> {
  if (!lastCheck) return true;

  const now = new Date();
  const retentionMs = parseInt(env.ETHERSCAN_API_HOLDER_CHECK_RETENTION) * 60 * 60 * 1000;
  const timeSinceLastCheck = now.getTime() - lastCheck.getTime();

  return timeSinceLastCheck > retentionMs;
}

export async function POST(req: Request) {
  try {
    const env = envSchema.parse(process.env);
    const body = await req.json();
    const validatedBody = requestSchema.parse(body);
    const { initData: telegramInitData, walletAddress } = validatedBody;

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);
    if (!validatedData || !user?.id) {
      return NextResponse.json({ success: false, message: 'Invalid authentication data' }, { status: 403 });
    }

    const telegramId = user.id.toString();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const dbUser = await tx.user.findUnique({
            where: { telegramId },
            select: { id: true, lastHolderCheckTimestamp: true }
          });

          if (!dbUser) {
            throw new Error('User not found');
          }

          const shouldCheck = await shouldCheckTokens(dbUser.lastHolderCheckTimestamp, env);
          if (!shouldCheck) {
            return {
              success: true,
              message: 'Check skipped - too soon since last check',
              checkSkipped: true
            };
          }

          const level = await checkTokenHoldings(walletAddress, env);
          const isHolder = level > 0;

          const updatedUser = await tx.user.update({
            where: { telegramId },
            data: {
              lastHolderCheckTimestamp: new Date(),
              isHolder,
              holderLevel: level
            }
          });

          return {
            success: true,
            message: 'Token holding status updated successfully',
            updatedUser,
            checkSkipped: false
          };
        });

        return NextResponse.json(result);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }

    console.error('Failed to update token holding status:', lastError);
    return NextResponse.json(
      {
        success: false,
        message: lastError?.message || 'Failed to update token holding status'
      },
      { status: 500 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
