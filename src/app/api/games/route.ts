import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";

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

    const userGames = await prisma.games.findUnique({
      where: { userId: telegramId },
    });

    if (!userGames) {
      return NextResponse.json(
        { error: "No games found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: userGames });
  } catch (error) {
    console.error("GET /api/games error:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId, games } = await req.json();

    if (!userId || !Array.isArray(games)) {
      return NextResponse.json(
        { error: "`userId` and `games` array are required" },
        { status: 400 }
      );
    }

    const created = await prisma.games.create({
      data: {
        userId,
        games,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record for this user already exists." },
        { status: 409 }
      );
    }

    console.error("POST /api/games error:", error);
    return NextResponse.json(
      { error: "Failed to create games record" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId, games } = await req.json();

    if (!userId || !Array.isArray(games)) {
      return NextResponse.json(
        { error: "`userId` and `games` array are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.games.update({
      where: { userId },
      data: { games },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/games error:", error);
    return NextResponse.json(
      { error: "Failed to update games" },
      { status: 500 }
    );
  }
}
