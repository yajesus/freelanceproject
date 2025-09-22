// src/app/api/combo-of-the-day/share-image-twitterio/route.ts
import { NextResponse } from 'next/server';
import { postTweet, uploadImageToTwitter } from '@/utils/twitter';
import { upgradesData } from '@/utils/upgrades-data';

export async function POST(req: Request) {
  try {
    // Check authentication
    const headers = req.headers;
    const authToken = headers.get('X-Twitter-Access-Token');
    const authSecret = headers.get('X-Twitter-Access-Secret');

    if (!authToken || !authSecret) {
      return NextResponse.json({ error: 'User not authenticated with Twitter' }, { status: 401 });
    }

    // Process request body
    const body = await req.json();
    const { comboImages } = body;

    if (!comboImages || comboImages.length !== 3) {
      return NextResponse.json({ error: 'Exactly 3 combo images are required' }, { status: 400 });
    }

    // Prepare image URLs with validation
    const imageUrls = comboImages.map((name: string) => {
      const match = upgradesData.find((upgrade) => upgrade.image === name);
      if (!match) {
        throw new Error(`Invalid image name: ${name}`);
      }
      // Use public URL instead of local file path
      return `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/upgrades/${match.src}`;
    });

    // Upload images to Twitter and get media IDs
    const mediaIds = await Promise.all(
      imageUrls.map(async (imageUrl: string) => {
        try {
          // Upload to Twitter and get media ID
          const uploadResult = await uploadImageToTwitter(imageUrl, authToken, authSecret);

          if (!uploadResult.success || !uploadResult.mediaId) {
            throw new Error(uploadResult.error || 'Failed to upload image to Twitter');
          }

          return uploadResult.mediaId;
        } catch (error) {
          console.error(`Failed to upload image ${imageUrl}:`, error);
          throw new Error(`Failed to upload image ${imageUrl.split('/').pop()}`);
        }
      })
    );

    // Compose tweet
    const tweetText =
      "🃏 Combo cracked!\nDoubled my rewards today on @JokInTheBox_Off 💥\nDon't miss your chance — find yours and share it now ⬇️\nt.me/JokInTheBoxBot\n#JOKCombo #EarnWhilePlaying #CryptoGaming";

    // Post tweet using twitterapi.io with media IDs and user credentials
    const result = await postTweet(tweetText, authToken, authSecret, mediaIds);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to post tweet' }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Tweet posted successfully',
      tweetUrl: result.tweetUrl,
      tweetId: result.tweetId
    });
  } catch (error) {
    console.error('Error in Twitter share API:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('image') ? 400 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: statusCode }
    );
  }
}
