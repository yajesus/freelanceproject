import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

// Simple in-memory cache to prevent duplicate verification calls
const verificationCache = new Map<string, { timestamp: number; result: any }>();
const CACHE_DURATION = 30000; // 30 seconds

export async function POST(req: Request) {
  try {
    const { initData: telegramInitData, verifyOnly = false } = await req.json();

    if (!telegramInitData) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData) {
      return NextResponse.json(
        { error: 'Invalid Telegram data' },
        { status: 403 }
      );
    }

    const telegramId = user.id?.toString();
    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    // Get the latest combo first
    const combo = await prisma.comboOfTheDay.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!combo) {
      return NextResponse.json({ error: 'No combo found' }, { status: 404 });
    }

    // Check cache to prevent duplicate verification calls
    const cacheKey = `${telegramId}-${combo.id}`;
    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached verification result');
      return NextResponse.json(cached.result);
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check user's combo progress
    const progress = await prisma.userComboProgress.findUnique({
      where: {
        userId_comboDate: {
          userId: dbUser.id,
          comboDate: combo.comboDate
        }
      }
    });

    if (!progress) {
      return NextResponse.json({ error: 'User combo progress not found' }, { status: 404 });
    }

    // If user hasn't shared yet, return early
    if (!progress.sharedOnX) {
      return NextResponse.json({
        success: true,
        message: 'User has not shared this combo yet',
        shared: false,
        verified: false,
        rewardClaimed: false
      });
    }

    // If reward already claimed, return success
    if (progress.rewardClaimed) {
      return NextResponse.json({
        success: true,
        message: 'Reward already claimed for this combo',
        shared: true,
        verified: true,
        rewardClaimed: true
      });
    }

    // If verifyOnly is true, just return the current status without Twitter API call
    if (verifyOnly) {
      return NextResponse.json({
        success: true,
        message: 'Share status checked',
        shared: true,
        verified: false,
        rewardClaimed: false
      });
    }

    // Verify tweet using twitterapi.io advanced search
    const tweetVerified = await verifyTweetWithTwitterAPI(dbUser.twitterHandle, combo.id);

    if (!tweetVerified) {
      const result = {
        success: true,
        message: 'Tweet not found yet',
        shared: true,
        verified: false,
        rewardClaimed: false
      };

      // Cache the result (shorter cache for "not found" to allow retries)
      verificationCache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });

      return NextResponse.json(result);
    }

    // Call the existing claim API with twitterShare: true
    const claimResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/combo-of-the-day/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: telegramInitData,
        twitterShare: true
      })
    });

    if (!claimResponse.ok) {
      throw new Error('Failed to claim reward');
    }

    const claimResult = await claimResponse.json();

    console.log('Tweet verified and reward claimed via existing API:', {
      userId: dbUser.id,
      comboId: combo.id,
      claimResult
    });

    const result = {
      success: true,
      message: 'Tweet verified and reward claimed',
      shared: true,
      verified: true,
      rewardClaimed: true,
      totalStars: claimResult.totalStars,
      points: claimResult.points
    };

    // Cache the result
    verificationCache.set(cacheKey, {
      timestamp: Date.now(),
      result
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error verifying tweet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify tweet' },
      { status: 500 }
    );
  }
}

async function verifyTweetWithTwitterAPI(twitterHandle: string | null, comboId: string): Promise<boolean> {
  try {
    if (!twitterHandle) {
      console.log('No Twitter handle found for user');
      return false;
    }

    // Search for tweets containing our combo share URL and user's handle
    const searchQuery = `from:${twitterHandle} "combo-share/${comboId}"`;
    
    const response = await fetch('https://api.twitterapi.io/twitter/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TWITTERAPI_IO_API_KEY}`
      },
      body: JSON.stringify({
        query: searchQuery,
        max_results: 10,
        tweet_fields: ['created_at', 'public_metrics', 'text']
      })
    });

    if (!response.ok) {
      console.error('Twitter API search failed:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Check if any tweet was created in the last 24 hours
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentTweets = data.data.filter((tweet: any) => {
        const tweetDate = new Date(tweet.created_at);
        return tweetDate > twentyFourHoursAgo;
      });

      if (recentTweets.length > 0) {
        console.log('Found recent tweet:', recentTweets[0].text);
        return true;
      }
    }

    console.log('No recent tweets found for combo:', comboId);
    return false;

  } catch (error) {
    console.error('Error verifying tweet with Twitter API:', error);
    return false;
  }
}
