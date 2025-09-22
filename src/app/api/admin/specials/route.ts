import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";

// GET - Fetch all specials upgrades
export async function GET() {
  try {
    const specials = await prisma.upgrade.findMany({
      where: {
        isSpecial: true,
      },
    });

    return NextResponse.json(specials);
  } catch (error) {
    console.error("Error fetching specials:", error);
    return NextResponse.json(
      { error: "Failed to fetch specials" },
      { status: 500 }
    );
  }
}

// POST - Create a new specials upgrade
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      baseCost,
      basePoints,
      imageUrl,
      countdownEndsAt,
      category,
      subcategory,
      srNo,
    } = body;

    // Validate required fields
    if (!name || !description || !baseCost || !basePoints) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the specials upgrade
    const specialUpgrade = await prisma.upgrade.create({
      data: {
        name,
        description,
        baseCost: parseInt(baseCost),
        basePoints: parseInt(basePoints),
        category,
        subcategory,
        srNo,
        imageUrl: imageUrl || null,
        countdownEndsAt: countdownEndsAt ? new Date(countdownEndsAt) : null,
        isSpecial: true,
      },
    });

    // Update special upgrades version to invalidate cache
    const currentVersion = Date.now().toString();
    await prisma.settings.upsert({
      where: { key: 'specialUpgradesVersion' },
      update: { value: { version: currentVersion } },
      create: { key: 'specialUpgradesVersion', value: { version: currentVersion } }
    });

    return NextResponse.json(specialUpgrade);
  } catch (error) {
    console.error("Error creating specials upgrade:", error);
    return NextResponse.json(
      { error: "Failed to create specials upgrade" },
      { status: 500 }
    );
  }
} 