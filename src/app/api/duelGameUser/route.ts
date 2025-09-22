import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";

export async function POST(req: Request) {
  try {
    const { telegramId }: { telegramId: string } = await req.json();

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.duelGameUser.findUnique({
      where: { userId: telegramId },
    });

    if (!existingUser) {
      const created = await prisma.duelGameUser.create({
        data: {
          userId: telegramId,
          energy: 50,
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
          watchedAds: 0,
          lastAdWatchReset: new Date(),
        },
      });

      return NextResponse.json({ success: true, data: created });
    }

    return NextResponse.json({ success: true, data: existingUser });
  } catch (error) {
    console.error("❌ POST /api/duelGameUser error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const {
      telegramId,
      ...fieldsToUpdate
    }: { telegramId: string; [key: string]: any } = await req.json();

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.duelGameUser.update({
      where: { userId: telegramId },
      data: fieldsToUpdate,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ PATCH /api/duelGameUser error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    let user = await prisma.duelGameUser.findUnique({
      where: { userId: telegramId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Game user not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    // ✅ Set initial lastAdWatchReset if missing
    if (!user.lastAdWatchReset) {
      user = await prisma.duelGameUser.update({
        where: { userId: telegramId },
        data: { lastAdWatchReset: now },
      });
    }

    // ✅ Reset watchedAds if 24h passed since lastAdWatchReset
    if (user.lastAdWatchReset) {
      const hoursSinceAdReset =
        (now.getTime() - user.lastAdWatchReset.getTime()) / (1000 * 60 * 60);

      if (hoursSinceAdReset >= 24) {
        user = await prisma.duelGameUser.update({
          where: { userId: telegramId },
          data: {
            watchedAds: 0,
            lastAdWatchReset: now,
          },
        });
      }
    }

    // ✅ Energy regen fallback
    if (!user.lastEnergyRegen || user.energy === 50) {
      user = await prisma.duelGameUser.update({
        where: { userId: telegramId },
        data: { lastEnergyRegen: now },
      });

      return NextResponse.json({ success: true, data: user });
    }

    const minutesPassed = Math.floor(
      (now.getTime() - new Date(user.lastEnergyRegen).getTime()) / (1000 * 60)
    );

    const energyToAdd = Math.floor(minutesPassed / 5);
    const updatedEnergy = Math.min(user.energy + energyToAdd, 50);

    if (energyToAdd > 0 && updatedEnergy > user.energy) {
      user = await prisma.duelGameUser.update({
        where: { userId: telegramId },
        data: {
          energy: updatedEnergy,
          lastEnergyRegen: now,
        },
      });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("❌ GET /api/duelGameUser error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
