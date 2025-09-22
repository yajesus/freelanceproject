// app/api/admin/task-actions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  const taskActions = await prisma.taskAction.findMany();
  return NextResponse.json(taskActions);
}

export async function POST(req: NextRequest) {
  const taskData = await req.json();
  const taskAction = await prisma.taskAction.create({ data: taskData });
  return NextResponse.json(taskAction);
}
