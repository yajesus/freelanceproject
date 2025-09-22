// app/api/admin/partners/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  const partners = await prisma.partner.findMany();

  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, image, link } = await req.json();
    if (!name || !description || !image || !link) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingPartner = await prisma.partner.findFirst({
      where: { name }
    });

    if (existingPartner) {
      return NextResponse.json({ error: 'Partner already exists' }, { status: 409 });
    }

    const partner = await prisma.partner.create({ data: { name, description, image, link } });
    return NextResponse.json(partner);
  } catch (error) {
    console.error('Create partner error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create partner' },
      { status: 500 }
    );
  }
}
