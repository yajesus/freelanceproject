// src/app/api/combo-of-the-day/generate-banner/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import cloudinary from '@/utils/cloudinary';
import { upgradeImageMap } from '@/images';

export async function POST(req: Request) {
  try {
    // Get today's combo
    const comboOfTheDay = await prisma.comboOfTheDay.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!comboOfTheDay) {
      return NextResponse.json({ error: 'No combo found for today' }, { status: 404 });
    }

    if (!comboOfTheDay.upgradeIds || comboOfTheDay.upgradeIds.length !== 3) {
      return NextResponse.json({ error: 'Invalid combo configuration - exactly 3 upgrades required' }, { status: 400 });
    }

    // Generate banner with 3 images
    const bannerUrl = await generateComboBanner(comboOfTheDay.upgradeIds);

    return NextResponse.json({
      success: true,
      comboId: comboOfTheDay.id,
      bannerUrl: bannerUrl,
      shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/combo-share/${comboOfTheDay.id}`
    });
  } catch (error) {
    console.error('Error generating combo banner:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate banner' },
      { status: 500 }
    );
  }
}

async function generateComboBanner(upgradeIds: string[]): Promise<string> {
  try {
    // Create a unique cache key based on the combo upgrade IDs
    const comboKey = upgradeIds.sort().join('-');
    const cacheKey = `combo-banner-${comboKey}`;

    // Check if banner already exists in Cloudinary
    try {
      const existingBanner = await cloudinary.search.expression(`public_id:${cacheKey}`).execute();

      if (existingBanner.resources && existingBanner.resources.length > 0) {
        console.log('Using cached banner for combo:', comboKey);
        return existingBanner.resources[0].secure_url;
      }
    } catch (error) {
      console.log('No cached banner found, generating new one');
    }

    // Fetch upgrades from database using _id
    console.log('Fetching upgrades for combo:', upgradeIds);
    const upgrades = await prisma.upgrade.findMany({
      where: {
        id: {
          in: upgradeIds
        }
      }
    });


    if (upgrades.length !== 3) {
      throw new Error(`Expected 3 upgrades, found ${upgrades.length}`);
    }

    // Get the actual upgrade images using upgradeImageMap
    const comboImages = upgrades.map((upgrade) => {
      if (!upgrade.image) {
        throw new Error(`Upgrade image is null for upgrade: ${upgrade.name}`);
      }
      const imagePath = upgradeImageMap[upgrade.image];
      if (!imagePath) {
        throw new Error(`Image path not found for upgrade: ${upgrade.image}`);
      }
      return path.join(process.cwd(), 'public', imagePath);
    });

    // Check if all images exist
    for (const imagePath of comboImages) {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }
    }

    // Banner dimensions - more compact and aesthetic
    const bannerWidth = 800;
    const bannerHeight = 300;
    const imageSize = 200;
    const spacing = 20;

    // Create banner canvas with gradient background
    const banner = sharp({
      create: {
        width: bannerWidth,
        height: bannerHeight,
        channels: 3,
        background: { r: 30, g: 30, b: 50 } // Dark blue background
      }
    });

    // Load and resize images with better processing
    const images = await Promise.all(
      comboImages.map(async (imagePath) => {
        return await sharp(imagePath)
          .resize(imageSize, imageSize, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
          })
          .sharpen() // Add sharpening for better quality
          .png()
          .toBuffer();
      })
    );

    // Calculate positions for 3 images horizontally
    const totalWidth = (imageSize * 3) + (spacing * 2);
    const startX = (bannerWidth - totalWidth) / 2;
    const y = (bannerHeight - imageSize) / 2;

    // Composite images onto banner
    const composites = images.map((image, index) => ({
      input: image,
      left: Math.round(startX + (index * (imageSize + spacing))),
      top: Math.round(y)
    }));

    // Generate the banner
    const bannerBuffer = await banner.composite(composites).png().toBuffer();

    // Only upload to Cloudinary if banner generation was successful
    try {
      const base64Banner = bannerBuffer.toString('base64');
      const uploadResponse = await cloudinary.uploader.upload(`data:image/png;base64,${base64Banner}`, {
        public_id: cacheKey,
        folder: 'combo-banners',
        resource_type: 'image'
      });

      console.log('Banner uploaded to Cloudinary:', uploadResponse.secure_url);

      // Add cache-busting parameter to force Twitter to fetch fresh image
      const cacheBuster = `?v=${Date.now()}`;
      return uploadResponse.secure_url + cacheBuster;
    } catch (uploadError) {
      console.error('Failed to upload banner to Cloudinary:', uploadError);
      throw new Error('Failed to upload banner to Cloudinary');
    }
  } catch (error) {
    console.error('Error generating combo banner:', error);
    // Fallback to Logo image
    return 'https://quests.jokinthebox.com/jok_logo.webp';
  }
}
