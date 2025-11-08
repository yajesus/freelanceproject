import prisma from "@/utils/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const result = [];
    const games = await prisma.duelGame.findMany({
      orderBy: { createdAt: "desc" },
    });

    for (const game of games) {
      const lobby = await prisma.lobby.findFirst({
        where: { gameId: game.id },
      });
      if (game.status == "pending") continue;

      let roundsData: any;
      try {
        roundsData =
          typeof game.rounds === "string"
            ? JSON.parse(game.rounds)
            : game.rounds;
      } catch {
        roundsData = {};
      }

      const rounds = [roundsData?.["1"], roundsData?.["2"], roundsData?.["3"]];
      let me = 0,
        pc = 0;
      for (const r of rounds) {
        if (!r) continue;
        me += r.me || 0;
        pc += r.pc || 0;
      }

      result.push({
        id: game.id,
        amount: lobby?.amount,
        player1: lobby?.userId1,
        player2: lobby?.userId2,
        score1: me,
        score2: pc,
        status: game.status,
      });

      if (result.length >= 3) break;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("API /history GET Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const result = [];
  const games = await prisma.duelGame.findMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
    },
    orderBy: { createdAt: "desc" },
  });
  for (const game of games) {
    const lobby = await prisma.lobby.findFirst({ where: { gameId: game.id } });

    // Parse rounds from JSON field
    const roundsData = game.rounds as any;
    const roundData =
      roundsData && typeof roundsData === "object"
        ? roundsData["1"] && roundsData["2"] && roundsData["3"]
          ? {
              round1: roundsData["1"],
              round2: roundsData["2"],
              round3: roundsData["3"],
            }
          : { round1: null, round2: null, round3: null }
        : { round1: null, round2: null, round3: null };

    const rounds = [roundData.round1, roundData.round2, roundData.round3];

    let round = 1;
    let me = 0;
    let pc = 0;

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      if (!r) continue;

      me += r.me || 0;
      pc += r.pc || 0;

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

    // Limit to 3 matches for testing purposes only then change it to 30
    if (result.length >= 3) break;
  }

  return NextResponse.json({ success: true, data: result });
}
