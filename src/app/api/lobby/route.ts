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
