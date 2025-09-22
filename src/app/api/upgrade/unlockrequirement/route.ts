// app/api/upgrade/skill/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  const unlockRequirements = await prisma.unlockRequirement.findMany();
  return NextResponse.json({ unlockRequirements });
}
