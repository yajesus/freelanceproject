// app/api/admin/messages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const messages = await prisma.scheduledMessage.findMany({
      where: { isScheduled: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, messages, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error fetching scheduled messages:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch scheduled messages' }, { status: 500 });
  }
}
