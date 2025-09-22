import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { generateChestReward } from "@/utils/generateChestReward";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");
    const userId = searchParams.get("userId");

    if (gameId) {
      const game = await prisma.duelGame.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        return NextResponse.json(
          { error: "Game not found with this ID" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: game });
    }

    if (userId) {
      const games = await prisma.duelGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      if (!games.length) {
        return NextResponse.json(
          { error: "No games found for this user" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: games });
    }

    const allGames = await prisma.duelGame.findMany();
    return NextResponse.json({ success: true, data: allGames });
  } catch (error) {
    console.error("GET /api/duelGame error:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

// ✅ POST: Create a DuelGame (no prizeId required here)
export async function POST(req: Request) {
  try {
    const { userId, round1, round2, round3, status, prizeId } =
      await req.json();

    if (!userId || !round1 || !round2 || !round3 || !status || !prizeId) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const created = await prisma.duelGame.create({
      data: { userId, round1, round2, round3, status, prizeId },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("POST /api/duelGame error:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}

// ✅ PATCH: Update game status and generate prize if won
export async function PATCH(req: Request) {
  try {
    const { gameId, status, ...fieldsToUpdate } = await req.json();

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId is required to update a game" },
        { status: 400 }
      );
    }

    const existingGame = await prisma.duelGame.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: "Game not found with this ID" },
        { status: 404 }
      );
    }

    let prizeId = existingGame.prizeId;

    // 🎁 If the user won and no prize has been created yet
    if (status === "win" && !prizeId) {
      const reward = generateChestReward();
      const createdPrize = await prisma.prize.create({
        data: {
          type: reward.type,
          result: reward.result,
        },
      });

      prizeId = createdPrize.id;

      // 🎉 Add reward to user's account
      const updateData: any = {};
      if (reward.type === "points") {
        updateData.points = { increment: reward.result.multiplier };
      } else if (reward.type === "stars") {
        updateData.totalStars = { increment: reward.result.stars };
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { telegramId: existingGame.userId },
          data: updateData,
        });
      }
    }

    // ✅ Final game update
    const updatedGame = await prisma.duelGame.update({
      where: { id: gameId },
      data: { ...fieldsToUpdate, status, prizeId },
    });

    return NextResponse.json({ success: true, data: updatedGame });
  } catch (error) {
    console.error("PATCH /api/duelGame error:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}
