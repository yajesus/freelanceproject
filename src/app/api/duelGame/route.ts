import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { generateChestReward } from '@/utils/generateChestReward';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (id) {
      const game = await prisma.duelGame.findUnique({
        where: { id: id },
      });

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found with this ID' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: game });
    }

    // if (userId) {
    //   const games = await prisma.duelGame.findMany({
    //     where: { userId1 },
    //     orderBy: { createdAt: "desc" },
    //   });

    //   if (!games.length) {
    //     return NextResponse.json(
    //       { error: "No games found for this user" },
    //       { status: 404 }
    //     );
    //   }

    //   return NextResponse.json({ success: true, data: games });
    // }

    const allGames = await prisma.duelGame.findMany();
    return NextResponse.json({ success: true, data: allGames });
  } catch (error) {
    console.log(error);
    console.error('GET /api/duelGame error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

// ✅ POST: Create a DuelGame (no prizeId required here)
export async function POST(req: Request) {
  try {
    const { userId1, userId2 } = await req.json();

    if (!userId1 || !userId2) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const created = await prisma.duelGame.create({
      data: { userId1, userId2 },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('POST /api/duelGame error:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

// ✅ PATCH: Update game status and generate prize if won
export async function PATCH(req: Request) {
  try {
    const { action, gameId, userId, round, move } = await req.json();

    console.log(
      '------------------------------ dual game patch ------------------------------'
    );
    console.log({ action, gameId, userId, round, move });

    if (action == 'playMove') {
      if (!gameId || !userId || typeof round === 'undefined' || !move) {
        console.log('⚠️ Missing gameId|userId|round|move');
        return NextResponse.json(
          { error: 'Missing gameId|userId|round|move' },
          { status: 400 }
        );
      }

      const game = await prisma.duelGame.findUnique({ where: { id: gameId } });
      if (!game)
        NextResponse.json({ error: 'Game not found' }, { status: 404 });

      const isUser1 = String(userId) === game?.userId1;
      const isUser2 = String(userId) === game?.userId2;
      if (!isUser1 && !isUser2) {
        console.log('⚠️ User not part of this game');
        console.log({ userId, userId1: game?.userId1, userId2: game?.userId2 });
        return NextResponse.json(
          { success: false, error: 'User not part of this game' },
          { status: 403 }
        );
      }

      const existingRounds: Record<string, any> = JSON.parse(
        JSON.stringify(game?.rounds || {})
      );
      const keys = Object.keys(existingRounds)
        .filter((k) => /^\d+$/.test(k))
        .map((k) => parseInt(k, 10));
      const lastRoundNum = keys.length ? Math.max(...keys) : 0;
      const lastRoundObj = lastRoundNum
        ? existingRounds[String(lastRoundNum)]
        : null;

      const expectedRound =
        lastRoundNum === 0
          ? 1
          : lastRoundObj && lastRoundObj.user1Move && lastRoundObj.user2Move
          ? lastRoundNum + 1
          : lastRoundNum;

      if (Number(round) !== Number(expectedRound)) {
        console.log(
          `⚠️ Invalid round. Expected ${expectedRound} but got ${round}`
        );
        return NextResponse.json(
          {
            success: false,
            error: `Invalid round. Expected ${expectedRound} but got ${round}`,
          },
          { status: 400 }
        );
      }

      const currentTurn = game?.currentTurn || 'user1'; // fallback to user1 if missing
      const expectedUserId =
        currentTurn === 'user1' ? game?.userId1 : game?.userId2;
      if (String(userId) !== expectedUserId) {
        console.log(`⚠️ Not your turn. Expected ${expectedUserId}`);
        console.log(`expectedUserId: ${expectedUserId}`);
        console.log(`userId: ${userId}`);
        console.log(`Player 1: ${game?.userId1}`);
        console.log(`Player 2: ${game?.userId2}`);
        return NextResponse.json(
          {
            success: false,
            error: `Not your turn. Expected ${expectedUserId}`,
          },
          { status: 400 }
        );
      }

      const roundKey = String(round);
      if (!existingRounds[roundKey]) existingRounds[roundKey] = {};
      const userKey = isUser1 ? 'user1Move' : 'user2Move';
      existingRounds[roundKey] = {
        ...existingRounds[roundKey],
        [userKey]: move,
      };

      const r = existingRounds[roundKey];
      if (r.user1Move && r.user2Move && !r.winner) {
        r.winner = calculateWinner(r.user1Move, r.user2Move);
        existingRounds[roundKey] = r;
      }

      const allRounds = Object.values(existingRounds);
      const completedRounds = allRounds.filter(
        (r: any) => r.user1Move && r.user2Move && r.winner
      );
      const user1Wins = completedRounds.filter(
        (x: any) => x.winner === 'user1'
      ).length;
      const user2Wins = completedRounds.filter(
        (x: any) => x.winner === 'user2'
      ).length;

      let newStatus = game?.status || 'in_progress';
      let winnerId: string | null = null;
      if (user1Wins === 2 || user2Wins === 2 || completedRounds.length >= 3) {
        newStatus = 'finished';
        winnerId =
          user1Wins > user2Wins ? game?.userId1 || '' : game?.userId2 || '';
      } else {
        newStatus = 'in_progress';
      }

      let nextTurn = currentTurn;
      // if both moves exist now, nextTurn -> user1 (start next round with user1) else flip turn to other player
      if (r.user1Move && r.user2Move) {
        nextTurn = 'user1';
      } else {
        nextTurn = currentTurn === 'user1' ? 'user2' : 'user1';
      }

      const updated = await prisma.duelGame.update({
        where: { id: gameId },
        data: {
          rounds: existingRounds,
          status: newStatus,
          winner: winnerId,
          currentTurn: nextTurn,
        },
      });

      if (newStatus === 'finished') {
        await prisma.lobby.updateMany({
          where: { gameId },
          data: {
            status: 'finished',
            winner: winnerId,
          },
        });
      }

      // return updated game so clients can sync immediately
      return NextResponse.json({ success: true, data: updated });
    }
  } catch (error) {
    console.error('PATCH /api/duelGame error:', error);
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }

  // try {
  //   const { gameId, status, ...fieldsToUpdate } = await req.json();

  //   if (!gameId) {
  //     return NextResponse.json(
  //       { error: "gameId is required to update a game" },
  //       { status: 400 }
  //     );
  //   }

  //   const existingGame = await prisma.duelGame.findUnique({
  //     where: { id: gameId },
  //   });

  //   if (!existingGame) {
  //     return NextResponse.json(
  //       { error: "Game not found with this ID" },
  //       { status: 404 }
  //     );
  //   }

  //   let prizeId = existingGame.prizeId;

  //   // 🎁 If the user won and no prize has been created yet
  //   if (status === "win" && !prizeId) {
  //     const reward = generateChestReward();
  //     const createdPrize = await prisma.prize.create({
  //       data: {
  //         type: reward.type,
  //         result: reward.result,
  //       },
  //     });

  //     prizeId = createdPrize.id;

  //     // 🎉 Add reward to user's account
  //     const updateData: any = {};
  //     if (reward.type === "points") {
  //       updateData.points = { increment: reward.result.multiplier };
  //     } else if (reward.type === "stars") {
  //       updateData.totalStars = { increment: reward.result.stars };
  //     }

  //     if (Object.keys(updateData).length > 0) {
  //       await prisma.user.update({
  //         where: { telegramId: existingGame.userId1 },
  //         data: updateData,
  //       });
  //     }
  //   }

  //   // ✅ Final game update
  //   const updatedGame = await prisma.duelGame.update({
  //     where: { id: gameId },
  //     data: { ...fieldsToUpdate, status, prizeId },
  //   });

  //   return NextResponse.json({ success: true, data: updatedGame });
  // } catch (error) {
  //   console.error("PATCH /api/duelGame error:", error);
  //   return NextResponse.json(
  //     { error: "Failed to update game" },
  //     { status: 500 }
  //   );
  // }
}

function calculateWinner(user1Move: string, user2Move: string) {
  const order = ['red', 'orange', 'blue'];
  const u1 = order.indexOf(user1Move);
  const u2 = order.indexOf(user2Move);
  if (u1 === u2) return 'draw';
  if ((u1 + 1) % 3 === u2) return 'user2';
  return 'user1';
}
