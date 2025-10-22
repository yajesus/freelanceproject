import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";

export async function GET(req: Request) {
  const lobbies = await prisma.lobby.findMany({
    where: { status: "pending" },
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

  return NextResponse.json({ success: true, data: lobbies });
}

export async function POST(req: Request) {
  const { userId, amount } = await req.json();

  if (!userId || !amount) {
    return NextResponse.json(
      { error: "userId and amount are required" },
      { status: 400 }
    );
  }

  const created = await prisma.lobby.create({
    data: {
      userId1: userId,
      amount,
      status: "pending",
    },
  });

  return NextResponse.json({ success: true, data: created });
}

export async function PATCH(req: Request) {
  const { lobbyId, userId, gameId } = await req.json();

  if (!lobbyId || !userId || !gameId) {
    return NextResponse.json(
      { error: "lobbyId, userId and gameId are required" },
      { status: 400 }
    );
  }

  const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
  const userId1 = lobby?.userId1;
  const status = lobby?.status;

  if (userId1 == userId) {
    return NextResponse.json(
      { error: "Can't play with the same id" },
      { status: 400 }
    );
  }

  if (status == "pending") {
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        userId2: userId,
        gameId,
        status: "playing",
      },
    });
  } else if (status == "playing") {
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        winner: userId,
        status: "finished",
      },
    });
  } else {
    return NextResponse.json(
      { error: "Something goes wrong" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
