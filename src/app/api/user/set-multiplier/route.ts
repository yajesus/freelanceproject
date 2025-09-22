import prisma from "@/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { telegramId, multiplier } = await req.json();

    if (!telegramId) {
      return NextResponse.json(
        { error: "Missing telegramId" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newPoints = multiplier
      ? user.points + user.yieldPerHour * multiplier
      : user.points + 400;

    await prisma.user.update({
      where: { telegramId },
      data: {
        points: newPoints,
        pointsBalance: newPoints,
        lastPointsUpdateTimestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, newPoints });
  } catch (error) {
    console.error("Multiplier update failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
