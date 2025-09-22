// app/api/admin/partners/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partnerData = await req.json();

    // Remove the id from the partnerData
    const { id, ...updateData } = partnerData;

    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error('Update partner error:', error);
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}
