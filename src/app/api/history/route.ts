import prisma from "@/utils/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const result = [];
  const games = await prisma.duelGame.findMany();
  for (const game of games) {
    const lobby = await prisma.lobby.findFirst({ where: { gameId: game.id } });
    if (game.status == "pending") continue;

    const rounds = [
      typeof game.round1 === "string" ? JSON.parse(game.round1) : game.round1,
      typeof game.round2 === "string" ? JSON.parse(game.round2) : game.round2,
      typeof game.round3 === "string" ? JSON.parse(game.round3) : game.round3,
    ];

    let me = 0;
    let pc = 0;

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      if (!r) continue;

      me += r.me;
      pc += r.pc;
    }

    const data = {
      id: game.id,
      amount: lobby?.amount,
      player1: lobby?.userId1,
      player2: lobby?.userId2,
      score1: me,
      score2: pc,
      status: game.status,
    };

    result.push({ ...data });
  }

  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const result = [];
  const games = await prisma.duelGame.findMany({ where: { userId } });
  for (const game of games) {
    const lobby = await prisma.lobby.findFirst({ where: { gameId: game.id } });

    const rounds = [
      typeof game.round1 === "string" ? JSON.parse(game.round1) : game.round1,
      typeof game.round2 === "string" ? JSON.parse(game.round2) : game.round2,
      typeof game.round3 === "string" ? JSON.parse(game.round3) : game.round3,
    ];

    let round = 1;
    let me = 0;
    let pc = 0;

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      if (!r) continue;

      me += r.me;
      pc += r.pc;

      if (r.me === 0 && r.pc === 0) {
        round = i + 1;
        break;
      }

      if (i === rounds.length - 1) {
        round = rounds.length;
      }
    }

    const data = {
      id: game.id,
      amount: lobby?.amount,
      player1: lobby?.userId1,
      player2: lobby?.userId2,
      score1: me,
      score2: pc,
      round: game.status == "pending" ? round : 3,
      status: game.status,
    };

    result.push({ ...data });
  }

  return NextResponse.json({ success: true, data: result });
}
