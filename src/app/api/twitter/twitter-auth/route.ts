// app/api/twitter/twitter-auth/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';


export async function POST(req: Request) {
  try {

    const {telegramId, userId, screenName, accessToken, accessSecret } = await req.json();

    if (!telegramId || !userId || !screenName || !accessToken || !accessSecret) {

      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
  
    const tgId = await telegramId.toString();
    const existingRecord = await prisma.twitterAuth.findUnique({
      where: { telegramId: tgId }
    });

    if (existingRecord) {
      // 2. Check if all fields are same
      const isSameData =
        existingRecord.userId === userId &&
        existingRecord.screenName === screenName &&
        existingRecord.accessToken === accessToken &&
        existingRecord.accessSecret === accessSecret;

      if (isSameData) {
        // 3. If same, return success without updating
        return NextResponse.json(
          { success: true, message: "Record already up-to-date", data: existingRecord },
          { status: 200 }
        );
      }

      // 4. If different, update record
      const updatedRecord = await prisma.twitterAuth.update({
        where: { telegramId: tgId },
        data: { userId, screenName, accessToken, accessSecret }
      });

      return NextResponse.json(
        { success: true, message: "Record updated", data: updatedRecord },
        { status: 200 }
      );
    } else {
      // 5. Create new record
      const newRecord = await prisma.twitterAuth.create({
        data: { telegramId: tgId, userId, screenName, accessToken, accessSecret }
      });

      return NextResponse.json(
        { success: true, message: "Record created", data: newRecord },
        { status: 200 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error('DB error:', error);
    return NextResponse.json(
      { error:message },
      { status: 500 }
    );
  }
}