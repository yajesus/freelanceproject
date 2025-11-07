import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { generateChestReward } from "@/utils/generateChestReward";
import { broadcast } from "@/lib/websocketServer";

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

// ✅ POST: Create a DuelGame 
export async function POST(req: Request) {
  try {
    const { userId, round1, round2, round3, status, prizeId } = await req.json();

    const u1 = String(userId || "").trim();
    if (!u1 || u1 === "undefined" || u1 === "null") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Map rounds into JSON
    const rounds: Record<string, any> = {};
    if (round1) rounds["1"] = { user1Move: null, user2Move: null };
    if (round2) rounds["2"] = { user1Move: null, user2Move: null };
    if (round3) rounds["3"] = { user1Move: null, user2Move: null };

    const created = await prisma.duelGame.create({
      data: {
        userId1: u1,
        userId2: "pc",
        rounds: Object.keys(rounds).length ? rounds : {},
        status: status || "pending",
        currentTurn: "user1",
        prizeId: prizeId || null, // ✅ added support for prizeId
      },
    });

    // ✅ Broadcast new game if it's a bot game
    if (status === "playing") {
      let player1Name = "Unknown";
      try {
        const user = await prisma.user.findUnique({
          where: { telegramId: created.userId1 },
          select: { name: true },
        });
        player1Name = user?.name || "Unknown";
      } catch (error) {
        console.error("Error fetching user name for bot game:", error);
      }

      broadcast({
        type: "ongoingGameUpdate",
        action: "created",
        game: {
          id: created.id,
          amount: 0,
          player1: created.userId1,
          player2: "Bot",
          player1Name,
          player2Name: "Bot",
          score1: 0,
          score2: 0,
          round: 1,
          status: created.status,
          isBotGame: true,
          prizeId: created.prizeId || null, // ✅ include prize info in broadcast
        },
      });
    }

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

    // 🎁 Generate prize if the user won and none exists yet
    if ((status === "finished" || status === "win") && !prizeId) {
      try {
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
            where: { telegramId: existingGame.userId1 },
            data: updateData,
          });
        }
      } catch (error) {
        console.error("Error generating prize:", error);
      }
    }

    // Map round updates if any
    const roundsUpdate: Record<string, any> = {};
    if (fieldsToUpdate.round1) roundsUpdate["1"] = fieldsToUpdate.round1;
    if (fieldsToUpdate.round2) roundsUpdate["2"] = fieldsToUpdate.round2;
    if (fieldsToUpdate.round3) roundsUpdate["3"] = fieldsToUpdate.round3;

    const data: any = {};
    if (status) data.status = status;
    if (prizeId) data.prizeId = prizeId;
    if (Object.keys(roundsUpdate).length) {
      const currentRounds = (existingGame.rounds as any) || {};
      data.rounds = { ...currentRounds, ...roundsUpdate };
    }

    // ✅ Final game update
    const updatedGame = await prisma.duelGame.update({
      where: { id: gameId },
      data,
    });

    // ✅ Broadcast updates
    if (status === "playing" || status === "finished") {
      const lobby = await prisma.lobby.findFirst({
        where: { gameId: gameId },
        include: {
          user1: { select: { name: true } },
          user2: { select: { name: true } },
        },
      });

      if (lobby || updatedGame.userId2 === "pc") {
        const isBotGame = updatedGame.userId2 === "pc";

        let player1Name = lobby?.user1?.name || "Unknown";
        if (isBotGame && !lobby) {
          try {
            const user = await prisma.user.findUnique({
              where: { telegramId: updatedGame.userId1 },
              select: { name: true },
            });
            player1Name = user?.name || "Unknown";
          } catch (error) {
            console.error("Error fetching user name for bot game update:", error);
          }
        }

        // Score + round calculation
        const rounds = updatedGame.rounds as any;
        let score1 = 0;
        let score2 = 0;
        let currentRound = 1;

        const roundArray = ["1", "2", "3"].map((r) => rounds?.[r] || null);
        for (let i = 0; i < roundArray.length; i++) {
          const r = roundArray[i];
          if (!r) {
            currentRound = i + 1;
            break;
          }
          if (r.me !== undefined && r.pc !== undefined) {
            score1 += r.me || 0;
            score2 += r.pc || 0;
          }
          if (i === roundArray.length - 1) currentRound = 3;
        }

        const gameUpdate = {
          id: updatedGame.id,
          amount: lobby?.amount || 0,
          player1: updatedGame.userId1,
          player2: isBotGame ? "Bot" : updatedGame.userId2 || "Unknown",
          player1Name,
          player2Name: isBotGame ? "Bot" : lobby?.user2?.name || "Unknown",
          score1,
          score2,
          round: currentRound,
          status: updatedGame.status,
          isBotGame,
          prizeId: updatedGame.prizeId || null, // ✅ include prize info
        };

        broadcast({
          type: "ongoingGameUpdate",
          action: status === "playing" ? "update" : "finished",
          game: gameUpdate,
        });
      }
    }

    return NextResponse.json({ success: true, data: updatedGame });
  } catch (error) {
    console.error("PATCH /api/duelGame error:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}
