// src/app/api/twitter/authenticated/route.ts
import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const headers = req.headers;

    let authToken = headers.get('X-Twitter-Access-Token');
    let authSecret = headers.get('X-Twitter-Access-Secret');
    if (!authToken || !authSecret) {
      return NextResponse.json(
        { authenticated: false, error: "Missing authentication tokens" },
        { status: 401 }
      );
    }
    
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY!,
      appSecret: process.env.TWITTER_CONSUMER_SECRET!,
      accessToken: authToken,
      accessSecret: authSecret,
    });

    const user = await client.v2.me();

    return NextResponse.json({
      authenticated: true,
      userId: user.data.id,
      username: user.data.username
    });

  } catch (error) {
    console.error('Twitter authentication error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: error instanceof Error ? error.message : "Authentication failed"
      },
      { status: 401 }
    );
  }
}