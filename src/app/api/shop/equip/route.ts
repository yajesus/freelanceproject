// app/api/shop/equip/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ShopCategory, ShopItem } from '@prisma/client';
import { calculateLevelIndex } from '@/utils/game-mechanics';
import { calculateYieldPerHour } from '@/utils/calculations';

interface PurchaseRequestBody {
  initData: string;
  itemId: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

export async function POST(req: Request) {
  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot token is missing' }, { status: 500 });
    }

    const requestBody: PurchaseRequestBody = await req.json();
    const { initData: telegramInitData, itemId } = requestBody;

    if (!telegramInitData || !itemId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);
    if (!validatedData || !user.id) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id.toString();

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const result = await prisma.$transaction(async (prisma) => {
          // Get shop item and user data
          const [shopItem, dbUser] = await Promise.all([
            prisma.shopItem.findUnique({ where: { id: itemId } }),
            prisma.user.findUnique({
              where: { telegramId },
              include: {
                inventory: {
                  include: {
                    items: {
                      where: { shopItemId: itemId }
                    }
                  }
                }
              }
            })
          ]);

          if (!shopItem) {
            throw new Error('Item not found');
          }

          if (!dbUser || !dbUser.inventory) {
            throw new Error('User or inventory not found');
          }

          // Check if item is already in inventory
          const hasItem = dbUser.inventory.items.length > 0;

          // Handle basic items
          if (shopItem.isBasic) {
            const yieldPerHour = calculateYieldPerHour(dbUser.bonusYieldPerHour ?? 0, dbUser.yieldPerHour);
            const gameLevelIndex = calculateLevelIndex(yieldPerHour);
            if (shopItem.level && shopItem.level > gameLevelIndex + 1) {
              throw new Error(`Item requires level ${shopItem.level}`);
            }

            // Add to inventory if not present
            if (!hasItem) {
              await prisma.userInventoryItem.create({
                data: {
                  userInventory: { connect: { id: dbUser.inventory.id } },
                  shopItem: { connect: { id: shopItem.id } }
                }
              });
            }
          } else {
            // Non-basic items must be in inventory to be equipped
            if (!hasItem) {
              throw new Error('Item not found in inventory');
            }
          }

          // Equip the item based on category
          const updateData = await getEquipUpdateData(shopItem.category, shopItem);
          if (!updateData) {
            throw new Error('Item cannot be equipped');
          }

          await prisma.userInventory.update({
            where: { id: dbUser.inventory.id },
            data: updateData
          });

          return {
            success: true,
            message: `Successfully equipped ${shopItem.name}`,
            equippedItem: shopItem
          };
        });

        return NextResponse.json(result);
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
          retries++;
          if (retries >= MAX_RETRIES) {
            return NextResponse.json({ error: 'Failed to process request after multiple attempts' }, { status: 500 });
          }
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Failed to process request after max retries' }, { status: 500 });
  } catch (error) {
    console.error('Error processing equip request:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request',
        details: error instanceof Error ? error.message : null
      },
      { status: 500 }
    );
  }
}

function getEquipUpdateData(category: ShopCategory, shopItem: ShopItem) {
  switch (category) {
    case ShopCategory.AVATAR:
      return { equippedAvatar: shopItem.id, equippedAvatarName: shopItem.image };
    case ShopCategory.BACKGROUND:
      return { equippedBackground: shopItem.id, equippedBackgroundName: shopItem.image };
    case ShopCategory.BOOST:
      return null; // Handle boost items separately
    case ShopCategory.OTHERS:
      return null; // Handle other items separately
    default:
      return null;
  }
}
