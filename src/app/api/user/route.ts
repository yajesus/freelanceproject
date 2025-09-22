// app/api/user/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import {
  NEW_USER_BONUS_POINTS,
  NEW_USER_BONUS_STARS,
  REFERRAL_BONUS_BASE,
  REFERRAL_BONUS_PREMIUM,
  TELEGRAM_BOT_WELCOME_MESSAGE
} from '@/utils/consts';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ShopCategory } from '@prisma/client';
import { sendMessageToUser } from '@/utils/telegram';

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

export async function POST(req: Request) {
  const body = await req.json();
  const { telegramInitData, referrerTelegramId } = body;

  console.log('Telegram Init Data:', telegramInitData);
  console.log('Referrer Telegram ID:', referrerTelegramId);

  if (!telegramInitData) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { validatedData, user: telegramUser } = validateTelegramWebAppData(telegramInitData);

  console.log('Validated data', validatedData);
  console.log('User', telegramUser);

  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = telegramUser.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  try {
    const dbUserUpdated = await prisma.$transaction(
      async (prisma) => {
        let dbUser = await prisma.user.findUnique({
          where: { telegramId },
          include: {
            referredBy: true,
            referrals: true,
            completedTasks: true,
            userUpgrades: true,
            inventory: { include: { items: { include: { shopItem: true } } } }
          }
        });

        const currentTime = new Date();

        if (dbUser) {
          // Existing user logic
          let retries = 0;
          while (retries < MAX_RETRIES) {
            try {
              if (!dbUser) {
                throw new Error('User data unexpectedly null');
              }

              const isPremium = telegramUser?.is_premium || false;

              dbUser = await prisma.user.update({
                where: {
                  telegramId,
                  lastPointsUpdateTimestamp: dbUser.lastPointsUpdateTimestamp // Optimistic lock
                },
                data: {
                  name: telegramUser?.first_name || '',
                  isPremium: isPremium
                },
                include: {
                  referredBy: true,
                  referrals: true,
                  completedTasks: true,
                  userUpgrades: true,
                  inventory: { include: { items: { include: { shopItem: true } } } }
                }
              });

              break; // Exit the retry loop if successful
            } catch (error) {
              if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
                // Optimistic locking failed, retry
                retries++;
                if (retries >= MAX_RETRIES) {
                  throw new Error('Max retries reached for optimistic locking');
                }
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff

                // Refresh user data before retrying
                dbUser = await prisma.user.findUnique({
                  where: { telegramId },
                  include: {
                    referredBy: true,
                    referrals: true,
                    completedTasks: true,
                    userUpgrades: true,
                    inventory: { include: { items: { include: { shopItem: true } } } }
                  }
                });
              } else {
                throw error;
              }
            }
          }
        } else {
          console.log('Creating new user');
          // New user creation
          let referredByUser = null;
          if (referrerTelegramId) {
            referredByUser = await prisma.user.findUnique({
              where: { telegramId: referrerTelegramId }
            });
          }

          const isPremium = telegramUser?.is_premium || false;
          const referralBonus = referredByUser ? (isPremium ? REFERRAL_BONUS_PREMIUM : REFERRAL_BONUS_BASE) : 0;

          // Add basic avatar and background to inventory
          const basicAvatar = await prisma.shopItem.findFirst({
            where: { category: ShopCategory.AVATAR, isBasic: true }
          });
          const basicBackground = await prisma.shopItem.findFirst({
            where: { category: ShopCategory.BACKGROUND, isBasic: true }
          });

          const inventoryCreateData: any = {
            create: {
              ...(basicAvatar && {
                equippedAvatar: basicAvatar.id,
                equippedAvatarName: basicAvatar.image
              }),
              ...(basicBackground && {
                equippedBackground: basicBackground.id,
                equippedBackgroundName: basicBackground.image
              }),
              items: {
                create: [
                  ...(basicAvatar ? [{ shopItem: { connect: { id: basicAvatar.id } } }] : []),
                  ...(basicBackground ? [{ shopItem: { connect: { id: basicBackground.id } } }] : [])
                ]
              }
            }
          };

          const defaultReminders = {
            day3: {
              reminderSent: false,
              reminderTimestamp: null
            },
            day6: {
              reminderSent: false,
              reminderTimestamp: null
            },
            day14: {
              reminderSent: false,
              reminderTimestamp: null
            }
          };

          dbUser = await prisma.user.create({
            data: {
              telegramId,
              name: telegramUser?.first_name || '',
              isPremium,
              points: referralBonus + NEW_USER_BONUS_POINTS,
              pointsBalance: referralBonus + NEW_USER_BONUS_POINTS,
              totalStars: NEW_USER_BONUS_STARS,
              earnedStars: NEW_USER_BONUS_STARS,
              referralPointsEarned: referralBonus,
              lastPointsUpdateTimestamp: currentTime,
              lastUpgradeYieldTimestamp: currentTime,
              yieldPerHour: 0,
              bonusYieldPerHour: 0,
              bonusOfflineYieldDuration: 0,
              lastClaimRewardDay: 0,
              lastClaimRewardTimestamp: currentTime,
              referredBy: referredByUser ? { connect: { id: referredByUser.id } } : undefined,
              inventory: inventoryCreateData,
              fakeFriends: 0,
              reminders: defaultReminders
            },
            include: {
              referredBy: true,
              referrals: true,
              completedTasks: true,
              userUpgrades: true,
              inventory: { include: { items: { include: { shopItem: true } } } }
            }
          });

          if (referredByUser) {
            // Reward the referrer
            await prisma.user.update({
              where: { id: referredByUser.id },
              data: {
                points: { increment: referralBonus },
                pointsBalance: { increment: referralBonus },
                referrals: { connect: { id: dbUser.id } }
              }
            });
          }

          await sendMessageToUser(Number(telegramId), TELEGRAM_BOT_WELCOME_MESSAGE);
        }

        return dbUser;
      },
      {
        maxWait: 5000,
        timeout: 15000
      }
    );

    if (!dbUserUpdated) {
      return NextResponse.json({ error: 'Failed to create/update user' }, { status: 500 });
    }

    // Calculate onChain count
    const userCompletions = await prisma.onchainTaskCompletion.findMany({
      where: {
        userId: dbUserUpdated.id
      },
      include: {
        onchainTask: true
      }
    });

    // Calculate total NFTs based on task metadata
    let onChainCount = 0;
    for (const completion of userCompletions) {
      const metadata = completion.onchainTask.itemMetadata as { name: string };
      let nftCount = 1; // default for regular certificate
      if (metadata.name.includes('X3')) nftCount = 3;
      if (metadata.name.includes('X5')) nftCount = 5;
      onChainCount += nftCount;
    }

    // Cap the count at 5
    onChainCount = Math.min(onChainCount, 5);

    // Enhanced user data with counts
    const enhancedUserData = {
      ...dbUserUpdated,
      referralCount: dbUserUpdated.referrals?.length || 0,
      completedTasksCount: dbUserUpdated.completedTasks?.length || 0,
      onChainCount: onChainCount || 0
    };

    return NextResponse.json(enhancedUserData);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        console.log('User already exists:', error);
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }
    }
    console.error('Error fetching/creating user:', error);
    return NextResponse.json({ error: 'Failed to fetch/create user' }, { status: 500 });
  }
}
