import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";

export async function GET(req: Request) {
  const lobbies = await prisma.createLobby.findMany();

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

  const created = await prisma.createLobby.create({
    data: {
      userId1: userId,
      gameId: "",
      userId2: "",
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

  const lobby = await prisma.createLobby.findUnique({ where: { id: lobbyId } });
  const userId1 = lobby?.userId1;
  const status = lobby?.status;

  if (userId1 == userId) {
    return NextResponse.json(
      { error: "Can't play with the same id" },
      { status: 400 }
    );
  }

  if (status != "pending") {
    return NextResponse.json(
      { error: "Can't play with the same id" },
      { status: 400 }
    );
  }

  const lobbies = await prisma.createLobby.update({
    where: { id: lobbyId },
    data: {
      userId2: userId,
      gameId,
      status: "playing",
    },
  });

  return NextResponse.json({ success: true, data: lobbies });
}
