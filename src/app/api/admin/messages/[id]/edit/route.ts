import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import moment from 'moment';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { title, message, imageUrl, buttonText, buttonUrl, scheduledAt } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    if (!scheduledAt) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 });
    }

    // Find the scheduled message
    const existingMessage = await prisma.scheduledMessage.findUnique({
      where: { id }
    });

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (existingMessage.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending messages can be edited' }, { status: 400 });
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

    // Update the scheduled message
    const updatedMessage = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        title,
        message,
        imageUrl: imageUrl || null,
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        scheduledAt: scheduledDate,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Message updated successfully',
      scheduledMessage: updatedMessage
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
} 