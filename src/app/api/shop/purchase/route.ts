// app/api/shop/purchase/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ShopItem } from '@prisma/client';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { ShopCategory, TransactionStatus } from '@prisma/client';
import { z } from 'zod';

const purchaseRequestSchema = z.object({
  initData: z.any(),
  itemId: z.string(),
  starsToUse: z.number().int().nonnegative().default(0)
});

type PurchaseRequestBody = z.infer<typeof purchaseRequestSchema>;

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;
const TRANSACTION_EXPIRY_MINS = 10;

const handleBoostPurchase = async (tx: Prisma.TransactionClient, userId: string, shopItem: ShopItem) => {
  if (!shopItem.boostDuration) throw new Error('Invalid boost duration');
  const currentTime = new Date();
  const expiryTime = new Date(currentTime.getTime() + shopItem.boostDuration * 60 * 60 * 1000);

  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const updateData: Record<string, any> = {};

  if (shopItem.boostType === 'offline') {
    if (user.activeOfflineBoostEndTime && user.activeOfflineBoostEndTime > currentTime) {
      const remainingTime = user.activeOfflineBoostEndTime.getTime() - currentTime.getTime();
      const newExpiryTime = new Date(currentTime.getTime() + remainingTime + shopItem.boostDuration * 60 * 60 * 1000);
      updateData.activeOfflineBoostEndTime = newExpiryTime;
    } else {
      updateData.activeOfflineBoostEndTime = expiryTime;
    }
    updateData.activeOfflineBoostDuration = shopItem.boostDuration;
  } else if (shopItem.boostType === 'rewards') {
    if (user.activeRewardBoostEndTime && user.activeRewardBoostEndTime > currentTime) {
      const remainingTime = user.activeRewardBoostEndTime.getTime() - currentTime.getTime();
      const newExpiryTime = new Date(currentTime.getTime() + remainingTime + shopItem.boostDuration * 60 * 60 * 1000);
      updateData.activeRewardBoostEndTime = newExpiryTime;
    } else {
      updateData.activeRewardBoostEndTime = expiryTime;
    }
    updateData.activeRewardBoostMultiplier = (shopItem.boostReward || 0) / 100;
  }

  await tx.user.update({
    where: { id: userId },
    data: updateData
  });

  return {
    boostType: shopItem.boostType,
    ...updateData
  };
};

const handleFriendsPurchase = async (tx: Prisma.TransactionClient, userId: string, shopItem: ShopItem) => {
  const friendMapping: Record<string, number> = {
    friendOne: 1,
    friendThree: 3,
    friendFive: 5,
    friendTen: 10
  };

  const friendCount = friendMapping[shopItem.name] || 0;

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: {
      fakeFriends: {
        increment: friendCount
      }
    },
    select: { fakeFriends: true }
  });

  return {
    fakeFriendsAdded: friendCount,
    totalFakeFriends: updatedUser.fakeFriends || 0
  };
};

export async function POST(req: NextRequest) {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: 'Telegram bot token is missing' }, { status: 500 });
  }

  let requestBody: PurchaseRequestBody;
  try {
    const body = await req.json();
    requestBody = purchaseRequestSchema.parse(body);
  } catch (error) {
    console.error('Invalid request body:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { initData: telegramInitData, itemId, starsToUse } = requestBody;
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
      const result = await prisma.$transaction(
        async (tx) => {
          const shopItem = await tx.shopItem.findUnique({
            where: { id: itemId }
          });
          if (!shopItem) throw new Error('Item not found');

          const dbUser = await tx.user.findUnique({
            where: { telegramId },
            include: { transactions: true }
          });
          if (!dbUser) throw new Error('User not found');

          if (starsToUse > 0) {
            const tenMinutesAgo = new Date(Date.now() - TRANSACTION_EXPIRY_MINS * 60 * 1000);

            const lastTransaction = dbUser.transactions.find(
              (transaction) =>
                transaction.sourceId === shopItem.id &&
                transaction.status === TransactionStatus.PENDING &&
                transaction.createdAt > tenMinutesAgo
            );

            if (!lastTransaction) {
              throw new Error('No pending transaction found');
            }

            if (dbUser.totalStars < starsToUse) {
              throw new Error('Insufficient stars balance');
            }

            await tx.transaction.update({
              where: { id: lastTransaction?.id || '' },
              data: { status: TransactionStatus.COMPLETED }
            });

            await tx.user.update({
              where: { id: dbUser.id },
              data: { totalStars: { decrement: starsToUse } }
            });
          }

          const userInventory = await tx.userInventory.upsert({
            where: { userId: dbUser.id },
            update: {},
            create: { userId: dbUser.id }
          });

          const userInventoryItem = await tx.userInventoryItem.upsert({
            where: {
              userInventoryId_shopItemId: {
                userInventoryId: userInventory.id,
                shopItemId: shopItem.id
              }
            },
            create: {
              userInventoryId: userInventory.id,
              shopItemId: shopItem.id,
              quantity: 1,
              usedAt: new Date()
            },
            update: {
              quantity: { increment: 1 },
              usedAt: new Date()
            }
          });

          const additionalData: Record<string, any> = {};

          switch (shopItem.category) {
            case ShopCategory.AVATAR:
              await tx.user.update({
                where: { id: dbUser.id },
                data: { bonusYieldPerHour: { increment: 5 } }
              });
              break;

            case ShopCategory.BACKGROUND:
              await tx.user.update({
                where: { id: dbUser.id },
                data: { bonusOfflineYieldDuration: { increment: 30 } }
              });
              break;

            case ShopCategory.BOOST: {
              const boostResult = await handleBoostPurchase(tx, dbUser.id, shopItem);
              additionalData.boost = boostResult;
              break;
            }

            case ShopCategory.OTHERS: {
              if (shopItem.name.includes('friend')) {
                const friendResult = await handleFriendsPurchase(tx, dbUser.id, shopItem);
                additionalData.friends = friendResult;
              }
              break;
            }
          }

          const updatedUser = await tx.user.findUnique({
            where: { id: dbUser.id },
            select: { totalStars: true, earnedStars: true }
          });

          return {
            success: true,
            userInventoryItem,
            starsUsed: starsToUse,
            remainingStars: updatedUser?.totalStars || 0,
            remainingEarnedStars: updatedUser?.earnedStars || 0,
            ...additionalData
          };
        },
        {
          maxWait: 5000,
          timeout: 10000
        }
      );

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error(`Purchase retry limit reached for user: ${telegramId}`);
          return NextResponse.json({ error: 'Transaction conflict, please try again' }, { status: 409 });
        }

        const delay = RETRY_DELAY * Math.pow(2, retries);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`Prisma error ${error.code}:`, error.message);
          return NextResponse.json({ error: 'Database operation failed', code: error.code }, { status: 500 });
        }

        if (error instanceof Error) {
          const errorMap: Record<string, number> = {
            'Item not found': 404,
            'User not found': 404,
            'No pending transaction found': 400,
            'Insufficient stars balance': 402
          };

          const statusCode = errorMap[error.message] || 500;
          return NextResponse.json({ error: error.message }, { status: statusCode });
        }

        console.error('Unhandled purchase error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ error: 'Processing failed after multiple attempts' }, { status: 500 });
}
