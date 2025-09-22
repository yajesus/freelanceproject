import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

// PUT - Update a specials upgrade
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, description, baseCost, basePoints, imageUrl, countdownEndsAt } = body;

    // Validate required fields
    if (!name || !description || !baseCost || !basePoints) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the specials upgrade
    const updatedUpgrade = await prisma.upgrade.update({
      where: { id },
      data: {
        name,
        description,
        baseCost: parseInt(baseCost),
        basePoints: parseInt(basePoints),
        imageUrl: imageUrl || null,
        countdownEndsAt: countdownEndsAt ? new Date(countdownEndsAt) : null
      }
    });

    // Update special upgrades version to invalidate cache
    const currentVersion = Date.now().toString();
    await prisma.settings.upsert({
      where: { key: 'specialUpgradesVersion' },
      update: { value: { version: currentVersion } },
      create: { key: 'specialUpgradesVersion', value: { version: currentVersion } }
    });

    return NextResponse.json(updatedUpgrade);
  } catch (error) {
    console.error('Error updating specials upgrade:', error);
    return NextResponse.json({ error: 'Failed to update specials upgrade' }, { status: 500 });
  }
}

// DELETE - Delete a specials upgrade
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Delete the specials upgrade
    await prisma.upgrade.delete({
      where: { id }
    });

    // Update special upgrades version to invalidate cache
    const currentVersion = Date.now().toString();
    await prisma.settings.upsert({
      where: { key: 'specialUpgradesVersion' },
      update: { value: { version: currentVersion } },
      create: { key: 'specialUpgradesVersion', value: { version: currentVersion } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting specials upgrade:', error);
    return NextResponse.json({ error: 'Failed to delete specials upgrade' }, { status: 500 });
  }
}
