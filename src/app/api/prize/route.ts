import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { generateChestReward } from "@/utils/generateChestReward";

export async function POST() {
  try {
    const reward = generateChestReward();

    const created = await prisma.prize.create({
      data: {
        type: reward.type,
        result: reward.result,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("POST /api/prize error:", error);
    return NextResponse.json(
      { error: "Failed to create prize" },
      { status: 500 }
    );
  }
}

// ✅ READ all or by id (GET)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const prize = await prisma.prize.findUnique({ where: { id } });
      if (!prize) {
        return NextResponse.json({ error: "Prize not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: prize });
    }

    const allPrizes = await prisma.prize.findMany();
    return NextResponse.json({ success: true, data: allPrizes });
  } catch (error) {
    console.error("GET /api/prize error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prizes" },
      { status: 500 }
    );
  }
}

// ✅ UPDATE Prize by id (PATCH)
export async function PATCH(req: Request) {
  try {
    const { id, type, result } = await req.json();

    if (!id || !type || !result) {
      return NextResponse.json(
        { error: "id, type, and result are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.prize.update({
      where: { id },
      data: { type, result },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/prize error:", error);
    return NextResponse.json(
      { error: "Failed to update prize" },
      { status: 500 }
    );
  }
}
