import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Find the scheduled message
    const scheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id }
    });

    if (!scheduledMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (scheduledMessage.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending messages can be cancelled' }, { status: 400 });
    }

    // Update the message status to cancelled
    await prisma.scheduledMessage.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({
      success: true,
      message: 'Message cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling message:', error);
    return NextResponse.json({ error: 'Failed to cancel message' }, { status: 500 });
  }
}
