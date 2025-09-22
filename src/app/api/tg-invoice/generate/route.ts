// app/api/tg-invoice/generate/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createInvoiceLink } from '@/utils/telegram';
import { TransactionStatus, TransactionType } from '@prisma/client';

interface RequestBody {
  initData: string;
  shopItemId: string;
  discount?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

export async function POST(req: Request) {
  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot token is missing' }, { status: 500 });
    }

    const requestBody: RequestBody = await req.json();
    const { initData: telegramInitData, shopItemId, discount = 0 } = requestBody;

    if (!telegramInitData || !shopItemId) {
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
          let isFullDiscount = false;
          let invoiceLink = null;

          const dbUser = await prisma.user.findUnique({
            where: { telegramId },
            include: {
              referrals: true
            }
          });

          if (!dbUser) {
            throw new Error('User not found');
          }

          const shopItem = await prisma.shopItem.findUnique({
            where: { id: shopItemId }
          });

          if (!shopItem) {
            throw new Error('Shop item not found');
          }

          if (shopItem.isBasic) {
            throw new Error('Invoice generation is not supported for basic items');
          }

          if (discount > dbUser.totalStars || discount > shopItem.price) {
            throw new Error('Invalid discount amount');
          }

          const invoiceAmount = Math.max(0, shopItem.price - discount);

          if (discount === shopItem.price) {
            isFullDiscount = true;
          }

          if (!isFullDiscount) {
            const invoicePayload = {
              name: shopItem.name,
              description: shopItem.description,
              prices: [
                {
                  label: 'Remaining amount',
                  amount: invoiceAmount
                }
              ],
              payload: `{"shopItemId": "${shopItemId}","price": ${shopItem.price},"discount": ${discount},"telegramId": "${telegramId}"}`
            };

            invoiceLink = await createInvoiceLink(invoicePayload);
            console.log('New Invoice link generated:', invoiceLink);

            if (!invoiceLink) {
              throw new Error('Failed to generate invoice link');
            }
          }

          await prisma.transaction.create({
            data: {
              userId: dbUser.id,
              sourceId: shopItem.id,
              amount: invoiceAmount,
              type: TransactionType.SHOP,
              status: TransactionStatus.PENDING,
              invoiceUrl: invoiceLink,
              description: `Purchase of ${shopItem.name} for ${invoiceAmount}/${shopItem.price} stars`
            }
          });

          return {
            success: true,
            message: `Invoice link generated`,
            invoiceLink
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
