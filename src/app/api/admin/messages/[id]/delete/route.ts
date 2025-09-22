import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: 'Only pending messages can be deleted' }, { status: 400 });
    }

    // Delete the scheduled message
    await prisma.scheduledMessage.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
} 