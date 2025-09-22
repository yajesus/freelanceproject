// app/api/upgrade/special-version/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Fetch the current version of special upgrades
export async function GET(req: NextRequest) {
  try {
    const versionSetting = await prisma.settings.findUnique({
      where: { key: 'specialUpgradesVersion' }
    });

    const version = versionSetting?.value ? (versionSetting.value as any).version || '0' : '0';

    return NextResponse.json({ version });
  } catch (error) {
    console.error('Error fetching special upgrades version:', error);
    return NextResponse.json({ version: '0' });
  }
}
