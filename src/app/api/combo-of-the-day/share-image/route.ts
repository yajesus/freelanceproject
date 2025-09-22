// src/app/api/combo-of-the-day/share-image/route.ts
import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import { upgradesData } from "@/utils/upgrades-data";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const convertWebpToPng = async (imagePath: string) => {
  const fullPath = path.join(process.cwd(), imagePath);
  try {
    const fileBuffer = await fs.readFile(fullPath);
    return await sharp(fileBuffer).png().toBuffer();
  } catch (error) {
    throw new Error(`Failed to process image ${imagePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export async function POST(req: Request) {
  try {
    // Check authentication - support both cookies and URL params
    const headers = req.headers;
    const authToken = headers.get('X-Twitter-Access-Token');
    const authSecret = headers.get('X-Twitter-Access-Secret');

    if (!authToken || !authSecret) {
      return NextResponse.json(
        { error: "User not authenticated with Twitter" },
        { status: 401 }
      );
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY!,
      appSecret: process.env.TWITTER_CONSUMER_SECRET!,
      accessToken: authToken,
      accessSecret: authSecret,
    });

    // Verify credentials first
    try {
      await client.v2.me();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid Twitter credentials. Please re-authenticate." },
        { status: 401 }
      );
    }

    // Process request body
    const body = await req.json();
    const { comboImages } = body;

    if (!comboImages || comboImages.length !== 3) {
      return NextResponse.json(
        { error: "Exactly 3 combo images are required" },
        { status: 400 }
      );
    }

    // Prepare image paths with validation
    const comboImagePaths = comboImages.map((name: string) => {
      const match = upgradesData.find((upgrade) => upgrade.image === name);
      if (!match) {
        throw new Error(`Invalid image name: ${name}`);
      }
      return `images/upgrades/${match.src}`;
    });

    // Upload images with error handling
    const mediaIds = await Promise.all(
      comboImagePaths.map(async (imgPath: string) => {
        try {
          const imgBuffer = await convertWebpToPng(imgPath);
          return await client.v1.uploadMedia(imgBuffer, {
            mimeType: "image/png"
          });
        } catch (error) {
          console.error(`Failed to upload image ${imgPath}:`, error);
          throw new Error(`Failed to upload image ${imgPath.split('/').pop()}`);
        }
      })
    );

    // Compose tweet
    const tweetText = `🃏 Combo cracked!
Doubled my rewards today on @JokInTheBox_Off 💥
Don't miss your chance — find yours and share it now 🎯
https://t.me/JokInTheBox_bot/JokInTheBox?startapp
#JOKCombo #EarnWhilePlaying #CryptoGaming`;

    // Post tweet using v2 with proper media_ids typing
    const tweet = await client.v2.tweet({
      text: tweetText,
      media: {
        media_ids: mediaIds as [string, string, string] // Explicit type assertion
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Tweet posted successfully",
      tweetUrl: `https://twitter.com/i/web/status/${tweet.data.id}`,
      tweetId: tweet.data.id,
    });

  } catch (error) {
    console.error("Error in Twitter share API:", error);

    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const statusCode = errorMessage.includes("authenticat") ? 401 :
      errorMessage.includes("image") ? 400 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ?
          (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: statusCode }
    );
  }
}