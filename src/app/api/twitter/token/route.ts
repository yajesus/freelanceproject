// app/api/twitter/token/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function POST(req: Request) {
  try {
    const { initData: telegramInitData } = await req.json();


    if (!telegramInitData) {
      return NextResponse.json(
        { error: "Invalid request: initData missing" },
        { status: 400 }
      );
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData) {
      return NextResponse.json(
        { error: "Invalid Telegram data" },
        { status: 403 }
      );
    }

    const telegramId = user.id?.toString();
    if (!telegramId) {
      return NextResponse.json(
        { error: "Invalid user data" },
        { status: 400 }
      );
    }

    // Fetch twitter auth by telegramId
    const authRecord = await prisma.twitterAuth.findUnique({
      where: {
        telegramId: telegramId,
      },
    });

    if (!authRecord) {
      return NextResponse.json(
        { error: 'No Twitter auth tokens found for this Telegram ID' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      accessToken: authRecord.accessToken,
      accessSecret: authRecord.accessSecret,
      userId: authRecord.userId,
      screenName: authRecord.screenName,
    });
  } catch (error) {
    console.error('Error fetching Twitter tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}