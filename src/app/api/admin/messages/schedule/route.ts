// api/admin/messages/schedule/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import moment from 'moment';

export async function POST(request: Request) {
  try {
    const { title, message, imageUrl, buttonText, buttonUrl, scheduledAt } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    if (!scheduledAt) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 });
    }

    // Parse the scheduled date using moment.js for better timezone handling
    const scheduledMoment = moment.utc(scheduledAt);
    
    if (!scheduledMoment.isValid()) {
      return NextResponse.json({ error: 'Invalid scheduled date format' }, { status: 400 });
    }

    // Get current time in UTC
    const nowMoment = moment.utc();
    
    // Add a small buffer (1 minute) to account for any processing delays
    const bufferMoment = nowMoment.clone().add(1, 'minute');
    
    if (scheduledMoment.isSameOrBefore(bufferMoment)) {
      console.log(`⚠️ Timezone issue detected - Scheduled: ${scheduledMoment.format()}, Now: ${nowMoment.format()}, Buffer: ${bufferMoment.format()}`);
      return NextResponse.json({ 
        error: 'Scheduled date must be at least 1 minute in the future',
        scheduledDate: scheduledMoment.format(),
        currentTime: nowMoment.format(),
        bufferTime: bufferMoment.format()
      }, { status: 400 });
    }

    // Convert to Date object for database storage
    const scheduledDate = scheduledMoment.toDate();

    // Create the scheduled message
    const scheduledMessage = await prisma.scheduledMessage.create({
      data: {
        title,
        message,
        imageUrl: imageUrl || null,
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        scheduledAt: scheduledDate,
        status: 'PENDING',
        sentCount: 0,
        failedCount: 0,
        isScheduled: true
      }
    });

    console.log(`📅 Message "${title}" scheduled for ${scheduledMoment.format()} (UTC)`);

    return NextResponse.json({
      success: true,
      message: 'Message scheduled successfully',
      scheduledMessage: {
        id: scheduledMessage.id,
        title: scheduledMessage.title,
        message: scheduledMessage.message,
        scheduledAt: scheduledMessage.scheduledAt,
        status: scheduledMessage.status
      }
    });
  } catch (error) {
    console.error('Error scheduling message:', error);
    return NextResponse.json(
      {
        error: 'Failed to schedule message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
