// app/api/admin/tasks/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const taskData = await req.json();

    // Remove the id from the taskData
    const { id, taskAction, ...updateData } = taskData;

    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.task.update({
      where: { id: params.id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false }
    });

    return NextResponse.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
