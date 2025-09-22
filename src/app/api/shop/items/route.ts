// app/api/shop/items/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  const shopItems = await prisma.shopItem.findMany();
  return NextResponse.json({ shopItems });
}
