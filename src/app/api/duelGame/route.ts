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
        where: {
          OR: [{ userId1: userId }, { userId2: userId }],
        },
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
    const { userId, round1, round2, round3, status } = await req.json();

    const u1 = String(userId || '').trim();
    if (!u1 || u1 === 'undefined' || u1 === 'null') {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Map legacy round fields into our rounds JSON
    const rounds: Record<string, any> = {};
    if (round1) rounds["1"] = { user1Move: null, user2Move: null };
    if (round2) rounds["2"] = { user1Move: null, user2Move: null };
    if (round3) rounds["3"] = { user1Move: null, user2Move: null };

    const created = await prisma.duelGame.create({
      data: {
        userId1: u1,
        userId2: 'pc',
        rounds: Object.keys(rounds).length ? rounds : {},
        status: status || 'pending',
        currentTurn: 'user1',
      },
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

    // Map legacy round updates to rounds JSON if present
    const roundsUpdate: Record<string, any> = {};
    if (fieldsToUpdate.round1) roundsUpdate["1"] = fieldsToUpdate.round1;
    if (fieldsToUpdate.round2) roundsUpdate["2"] = fieldsToUpdate.round2;
    if (fieldsToUpdate.round3) roundsUpdate["3"] = fieldsToUpdate.round3;

    const data: any = {};
    if (status) data.status = status;
    if (Object.keys(roundsUpdate).length) data.rounds = roundsUpdate;

    const updatedGame = await prisma.duelGame.update({
      where: { id: gameId },
      data,
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