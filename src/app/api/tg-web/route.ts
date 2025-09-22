// app/api/tg-web/route.ts

import { TELEGRAM_BOT_AUTO_REPLY } from '@/utils/consts';
import { sendMessageToUser } from '@/utils/telegram';
import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { TransactionStatus, TransactionType } from '@prisma/client';

// Strong typing for Telegram webhook payloads
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  pre_checkout_query?: TelegramPreCheckoutQuery;
}

interface TelegramMessage {
  message_id: number;
  chat: {
    id: number;
    [key: string]: any;
  };
  text?: string;
  [key: string]: any;
}

interface TelegramPreCheckoutQuery {
  id: string;
  from: {
    id: number;
    [key: string]: any;
  };
  invoice_payload: string;
  [key: string]: any;
}

interface PayloadData {
  telegramId?: string;
  topupAmount?: number;
}

const BOT_TOKEN = process.env.BOT_TOKEN;

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Webhook is working' });
}

export async function POST(req: Request) {
  console.log('WEBHOOK CALL!!!');

  try {
    const body: TelegramUpdate = await req.json();
    console.log('Request body:', JSON.stringify(body));

    if (!BOT_TOKEN) {
      throw new Error('Telegram bot token is missing');
    }

    if (!body.update_id) {
      return NextResponse.json({ error: 'Invalid update format' }, { status: 400 });
    }

    // Handle updates
    switch (true) {
      case !!body.pre_checkout_query:
        await handlePreCheckoutQuery(body.pre_checkout_query);
        break;
      case !!body.message:
        await handleMessage(body.message);
        break;
      default:
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;

    console.error('Webhook processing error:', {
      message: errorMessage,
      stack,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ error: 'Failed to process webhook', message: errorMessage }, { status: 500 });
  }
}

async function handlePreCheckoutQuery(preCheckoutQuery: TelegramPreCheckoutQuery): Promise<void> {
  try {
    // Answer the pre-checkout query first
    const formdata = new FormData();
    formdata.append('pre_checkout_query_id', preCheckoutQuery.id);
    formdata.append('ok', 'true');

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: 'POST',
      body: formdata,
      redirect: 'follow' as RequestRedirect
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Failed to answer pre-checkout query: ${JSON.stringify(data)}`);
    }

    let payload: PayloadData;
    try {
      payload = JSON.parse(preCheckoutQuery.invoice_payload);
    } catch (e) {
      throw new Error(`Invalid invoice payload: ${preCheckoutQuery.invoice_payload}`);
    }

    const { telegramId, topupAmount } = payload;

    if (!telegramId || !topupAmount) {
      throw new Error(`Missing required payload data: ${JSON.stringify(payload)}`);
    }

    await prisma.$transaction(async (tx) => {
      // Update user balance
      const updatedUser = await tx.user.update({
        where: { telegramId },
        data: {
          totalStars: {
            increment: topupAmount
          }
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          amount: topupAmount,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          userId: updatedUser.id
        }
      });
    });
  } catch (error) {
    console.error('Error processing pre-checkout query:', error);
    throw error; // Re-throw for main handler to catch
  }
}
async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat?.id;

  if (!chatId) {
    console.error('Message missing chat ID, cannot respond');
    return;
  }

  try {
    if (message.text) {
      await sendMessageToUser(chatId);
    } else {
      console.log('Unhandled message:', message.text);
    }
  } catch (error) {
    console.error(`Failed to handle message for chat ${chatId}:`, error);
    // Don't throw here to prevent the webhook from failing if a single message fails
  }
}
