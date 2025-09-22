import prisma from "@/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { telegramId, stars } = await req.json();

    if (!telegramId || typeof stars !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { telegramId },
      data: {
        totalStars: user.totalStars + stars,
        earnedStars: user.earnedStars + stars,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${stars} stars added to user.`,
      totalStars: updatedUser.totalStars,
    });
  } catch (error) {
    console.error("Error setting stars:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
