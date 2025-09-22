// app/api/admin/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  const tasks = await prisma.task.findMany({
    where: { isDeleted: false },
    include: { taskAction: true }
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const { taskAction, ...taskData } = await req.json();

  const task = await prisma.task.create({ data: taskData });
  return NextResponse.json(task);
}
