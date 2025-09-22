import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import prisma from '@/utils/prisma';
import cloudinary from '@/utils/cloudinary';
import { calculateYieldPerHour } from '@/utils/calculations';
import { calculateLevelIndex } from '@/utils/game-mechanics';

export const POST = async (req: NextRequest, res: NextResponse) => {
  const formData: FormData = await req.formData();
  const telegramInitData = formData.get('initData') as string;
  if (!telegramInitData) {
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

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the file from the form data
    const file = formData.get('file') as File;

    // Check if a file is received
    if (!file) {
      return NextResponse.json({ error: 'No files received.' }, { status: 400 });
    }

    if (file.type !== 'image/png') {
      return NextResponse.json(
        {
          error: 'Unsupported file type. Only image/png is allowed.'
        },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File size exceeds 5MB.'
        },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64File = Buffer.from(buffer).toString('base64');
    const uploadResponse = await cloudinary.uploader.upload(`data:${file.type};base64,${base64File}`);

    return NextResponse.json({ url: uploadResponse.url });
  } catch (error) {
    console.log('Error occurred ', error);
    return NextResponse.json({ error: 'Failed to upload image to Telegram' }, { status: 500 });
  }
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const initData = url.searchParams.get('initData');

    // Validate request data
    if (!userId || !initData) {
      return NextResponse.json({ error: 'Missing userId or initData' }, { status: 400 });
    }

    // Validate Telegram data for the requesting user
    const { validatedData } = validateTelegramWebAppData(initData);
    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    // Find the requested user
    const targetUser = await prisma.user.findUnique({
      where: { telegramId: userId },
      include: {
        referrals: true,
        completedTasks: true,
        inventory: {
          select: {
            equippedAvatarName: true,
            equippedBackgroundName: true
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's completions to calculate NFT count
    const userCompletions = await prisma.onchainTaskCompletion.findMany({
      where: {
        userId: targetUser.id
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

    const yieldPerHour = calculateYieldPerHour(targetUser.bonusYieldPerHour ?? 0, targetUser.yieldPerHour);
    const gameLevelIndex = calculateLevelIndex(yieldPerHour);

    // Construct the user passport data
    const userData = {
      telegramName: targetUser.name || 'User',
      levelIndex: gameLevelIndex || 0,
      yieldPerHour: targetUser.yieldPerHour || 0,
      bonusYieldPerHour: targetUser.bonusYieldPerHour || 0,
      equippedAvatar: targetUser.inventory?.equippedAvatarName || 'default_avatar.png',
      equippedWallpaper: targetUser.inventory?.equippedBackgroundName || 'default_background.png',
      holderLevel: targetUser.holderLevel || 0,
      referralCount: targetUser.referrals.length || 0,
      completedTasksCount: targetUser.completedTasks.length || 0,
      fakeFriends: targetUser.fakeFriends || 0
    };

    return NextResponse.json({
      userData,
      onChainCount: onChainCount || 0
    });
  } catch (error) {
    console.error('Error fetching passport data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch passport data'
      },
      {
        status: 500
      }
    );
  }
}
