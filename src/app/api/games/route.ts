import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get("telegramId");
    const type = searchParams.get("type"); // 'user' or 'ongoing'

    // Handle ongoing games request
    if (type === "ongoing") {
      const ongoingGames = await prisma.duelGame.findMany({
        where: {
          status: "playing",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100, // Limit to 100 ongoing games or change to what limit amount you want 
      });

      const result = [];
      for (const game of ongoingGames) {
        const lobby = await prisma.lobby.findFirst({
          where: { gameId: game.id },
          include: {
            user1: {
              select: {
                name: true,
              },
            },
            user2: {
              select: {
                name: true,
              },
            },
          },
        });

        // For bot games, we might not have a lobby, so continue without it
        const isBotGame = game.userId2 === "pc";
        
        // For user vs user games, we need a lobby
        if (!isBotGame && !lobby) continue;

        // Parse rounds to calculate scores and current round
        const rounds = game.rounds as any;
        let score1 = 0;
        let score2 = 0;
        let currentRound = 1;

        // Handle both old format (round1, round2, round3) and new format (rounds JSON)
        const roundData = rounds && typeof rounds === "object" 
          ? (rounds["1"] && rounds["2"] && rounds["3"] 
              ? { round1: rounds["1"], round2: rounds["2"], round3: rounds["3"] }
              : { round1: null, round2: null, round3: null })
          : { round1: null, round2: null, round3: null };

        const roundArray = [roundData.round1, roundData.round2, roundData.round3];
        
        for (let i = 0; i < roundArray.length; i++) {
          const r = roundArray[i];
          if (!r) {
            currentRound = i + 1;
            break;
          }
          // Handle different round data structures
          if (r.me !== undefined && r.pc !== undefined) {
            score1 += r.me || 0;
            score2 += r.pc || 0;
          } else if (r.user1Move !== undefined && r.user2Move !== undefined) {
            // New format - need to determine scores from moves
            // For now, set scores to 0 if moves exist
          }
          if (i === roundArray.length - 1) {
            currentRound = 3;
          }
        }

        // Get user1 name for bot games
        let player1Name = "Unknown";
        if (isBotGame && !lobby) {
          const user1 = await prisma.user.findUnique({
            where: { telegramId: game.userId1 },
            select: { name: true },
          });
          player1Name = user1?.name || "Unknown";
        }

        result.push({
          id: game.id,
          amount: lobby?.amount || 0,
          player1: game.userId1,
          player2: isBotGame ? "Bot" : lobby?.userId2 || "Unknown",
          player1Name: lobby?.user1?.name || player1Name,
          player2Name: isBotGame ? "Bot" : lobby?.user2?.name || "Unknown",
          score1,
          score2,
          round: currentRound,
          status: game.status,
          isBotGame,
        });
      }

      return NextResponse.json({ success: true, data: result });
    }

    // Original logic for user games
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
