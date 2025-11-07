import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { broadcast } from '@/lib/websocketServer';

export async function GET(req: Request) {
  try {
    // Limit results to 50-100 as per requirements
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const take = Math.min(Math.max(limit, 1), 100); // Clamp between 1-100

    const lobbies = await prisma.lobby.findMany({
      where: { status: 'pending' },
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
      orderBy: {
        createdAt: 'desc',
      },
      take,
    });

    // Format the response to match the expected interface
    const formattedLobbies = lobbies.map((lobby) => ({
      id: lobby.id,
      userId1: lobby.userId1,
      userId2: lobby.userId2 || null,
      amount: lobby.amount.toString(), // Convert to string to match interface
      createdAt: lobby.createdAt.toISOString(),
      status: lobby.status,
      user1: lobby.user1 || { name: 'Unknown' },
      user2: lobby.user2 || null,
    }));

    return NextResponse.json({ success: true, data: formattedLobbies });
  } catch (error) {
    console.error('GET /api/lobby error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch lobbies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId, amount } = await req.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'userId and valid amount are required' },
        { status: 400 }
      );
    }

    // Ensure amount is an integer
    const betAmount = parseInt(amount.toString(), 10);
    if (isNaN(betAmount) || betAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid bet amount' },
        { status: 400 }
      );
    }

    // Verify user has enough Stars
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      select: { totalStars: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.totalStars < betAmount) {
      return NextResponse.json(
        { error: 'Insufficient Stars balance' },
        { status: 400 }
      );
    }

    // Deduct Stars from user when placing bet
    await prisma.user.update({
      where: { telegramId: userId },
      data: { totalStars: { decrement: betAmount } },
    });

    const created = await prisma.lobby.create({
      data: {
        userId1: userId,
        amount: betAmount,
        status: 'pending',
      },
      include: {
        user1: {
          select: {
            name: true,
          },
        },
      },
    });

    // Broadcast new lobby to all connected clients
    broadcast({
      type: 'lobbyUpdate',
      action: 'created',
      lobby: {
        id: created.id,
        userId1: created.userId1,
        user1: created.user1,
        amount: created.amount,
        status: created.status,
        createdAt: created.createdAt,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('POST /api/lobby error:', error);
    return NextResponse.json(
      { error: 'Failed to create lobby' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { lobbyId, userId, action } = await req.json();

    if (!lobbyId || !userId) {
      return NextResponse.json(
        { error: 'lobbyId and userId are required' },
        { status: 400 }
      );
    }

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        user1: {
          select: {
            name: true,
            totalStars: true,
          },
        },
      },
    });

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    const userId1 = lobby.userId1;
    const status = lobby.status;

    // Prevent user from accepting their own bet
    if (userId1 === userId) {
      return NextResponse.json(
        { error: "Can't accept your own bet" },
        { status: 400 }
      );
    }

    // Handle accepting a bet
    if (action === 'accept' && status === 'pending') {
      try {
        // Verify accepting user has enough Stars to match the bet
        const acceptingUser = await prisma.user.findUnique({
          where: { telegramId: userId },
          select: { totalStars: true },
        });

        if (!acceptingUser) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        if (acceptingUser.totalStars < lobby.amount) {
          return NextResponse.json(
            { error: 'Insufficient Stars to accept this bet' },
            { status: 400 }
          );
        }

        // Use transaction to ensure atomicity - deduct Stars and create game
        const result = await prisma.$transaction(async (tx) => {
          // Deduct Stars from accepting user
          await tx.user.update({
            where: { telegramId: userId },
            data: { totalStars: { decrement: lobby.amount } },
          });

          // Create game directly (no prize needed upfront - will be handled on game finish)
          const gameData = await tx.duelGame.create({
            data: {
              userId1: userId1,
              userId2: userId,
              rounds: {
                round1: { me: 0, pc: 0 },
                round2: { me: 0, pc: 0 },
                round3: { me: 0, pc: 0 },
              },
              status: 'pending',
            },
          });

          return gameData;
        });

        const gameData = result;

        // Update lobby with accepting user and game ID
        const updatedLobby = await prisma.lobby.update({
          where: { id: lobbyId },
          data: {
            userId2: userId,
            gameId: gameData.id,
            status: 'playing',
          },
          include: {
            user1: {
              select: { name: true },
            },
            user2: {
              select: { name: true },
            },
          },
        });

        // Update game status to playing
        await prisma.duelGame.update({
          where: { id: gameData.id },
          data: { status: 'playing' },
        });

        // Broadcast lobby update
        broadcast({
          type: 'lobbyUpdate',
          action: 'accepted',
          lobby: updatedLobby,
          gameId: gameData.id,
        });

        // Broadcast ongoing game creation
        broadcast({
          type: 'ongoingGameUpdate',
          action: 'created',
          game: {
            id: gameData.id,
            amount: updatedLobby.amount,
            player1: updatedLobby.userId1,
            player2: updatedLobby.userId2 || "Unknown",
            player1Name: updatedLobby.user1?.name || "Unknown",
            player2Name: updatedLobby.user2?.name || "Unknown",
            score1: 0,
            score2: 0,
            round: 1,
            status: 'playing',
            isBotGame: false,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            lobby: updatedLobby,
            gameId: gameData.id,
          },
        });
      } catch (error) {
        console.error('Error accepting bet:', error);
        // If transaction failed, try to refund accepting user
        try {
          await prisma.user.update({
            where: { telegramId: userId },
            data: { totalStars: { increment: lobby.amount } },
          });
        } catch (refundError) {
          console.error('Failed to refund user after error:', refundError);
        }
        return NextResponse.json(
          { error: 'Failed to accept bet. Please try again.' },
          { status: 500 }
        );
      }
    }
    // Handle marking winner (when game finishes)
    else if (action === 'finish' && status === 'playing') {
      const { winnerId } = await req.json();

      if (!winnerId) {
        return NextResponse.json(
          { error: 'winnerId is required for finish action' },
          { status: 400 }
        );
      }

      const updatedLobby = await prisma.lobby.update({
        where: { id: lobbyId },
        data: {
          winner: winnerId,
          status: 'finished',
        },
        include: {
          user1: {
            select: { name: true },
          },
          user2: {
            select: { name: true },
          },
        },
      });

      // Update game status to finished
      if (lobby.gameId) {
        await prisma.duelGame.update({
          where: { id: lobby.gameId },
          data: { status: 'finished', winner: winnerId },
        });

        // Get game data for broadcast
        const game = await prisma.duelGame.findUnique({
          where: { id: lobby.gameId },
        });

        if (game) {
          const rounds = game.rounds as any;
          let score1 = 0;
          let score2 = 0;
          let currentRound = 3;

          const roundData = rounds && typeof rounds === "object"
            ? (rounds["1"] && rounds["2"] && rounds["3"]
                ? { round1: rounds["1"], round2: rounds["2"], round3: rounds["3"] }
                : { round1: null, round2: null, round3: null })
            : { round1: null, round2: null, round3: null };

          const roundArray = [roundData.round1, roundData.round2, roundData.round3];

          for (let i = 0; i < roundArray.length; i++) {
            const r = roundArray[i];
            if (r && r.me !== undefined && r.pc !== undefined) {
              score1 += r.me || 0;
              score2 += r.pc || 0;
            }
          }

          // Broadcast ongoing game finished
          broadcast({
            type: 'ongoingGameUpdate',
            action: 'finished',
            game: {
              id: game.id,
              amount: updatedLobby.amount,
              player1: game.userId1,
              player2: game.userId2 === "pc" ? "Bot" : game.userId2 || "Unknown",
              player1Name: updatedLobby.user1?.name || "Unknown",
              player2Name: game.userId2 === "pc" ? "Bot" : updatedLobby.user2?.name || "Unknown",
              score1,
              score2,
              round: currentRound,
              status: 'finished',
              isBotGame: game.userId2 === "pc",
            },
          });
        }
      }

      // Broadcast lobby finished
      broadcast({
        type: 'lobbyUpdate',
        action: 'finished',
        lobby: updatedLobby,
      });

      return NextResponse.json({ success: true, data: updatedLobby });
    } else {
      return NextResponse.json(
        { error: 'Invalid action or lobby status' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('PATCH /api/lobby error:', error);
    return NextResponse.json(
      { error: 'Failed to update lobby' },
      { status: 500 }
    );
  }
}
