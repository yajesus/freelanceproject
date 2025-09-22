export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/prisma";

function getStartOf(unit: "week" | "month") {
  const now = new Date();
  if (unit === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    now.setDate(diff);
  } else if (unit === "month") {
    now.setDate(1);
  }
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function GET(req: NextRequest) {
  try {
    const telegramId = req.nextUrl.searchParams.get("telegramId");
    if (!telegramId) {
      return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: { inventory: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result: Record<string, any> = {};

    const periods: { key: string; from: Date | null }[] = [
      { key: "Week", from: getStartOf("week") },
      { key: "Month", from: getStartOf("month") },
    ];

    // === AllTime using DuelGame ===
    const allDuelGames = await prisma.duelGame.findMany({
      select: {
        userId: true,
        status: true,
      },
    });

    const allTimeWinMap: Record<string, number> = {};
    const allTimeGameCount: Record<string, number> = {};

    for (const game of allDuelGames) {
      const uid = game.userId!;
      if (!uid) continue;

      allTimeGameCount[uid] = (allTimeGameCount[uid] || 0) + 1;
      if (game.status === "win") {
        allTimeWinMap[uid] = (allTimeWinMap[uid] || 0) + 1;
      }
    }

    const allSortedIds = Object.keys(allTimeWinMap).sort(
      (a, b) => allTimeWinMap[b] - allTimeWinMap[a]
    );
    const topAllTimeIds = allSortedIds.slice(0, 100);
    const allTimeIdsToFetch = Array.from(new Set([...topAllTimeIds, telegramId])).filter(
      (id): id is string => id !== null
    );

    const allTimeUsers = await prisma.user.findMany({
      where: { telegramId: { in: allTimeIdsToFetch } },
      include: { inventory: true },
    });

    const allTimeLeaderboard = topAllTimeIds.map((id, index) => {
      const u = allTimeUsers.find(u => u.telegramId === id);
      return {
        name: u?.name || "Unknown",
        avatar: u?.inventory?.equippedAvatar || null,
        rank: index + 1,
        wins: allTimeWinMap[id] || 0,
        totalGames: allTimeGameCount[id] || 0,
        telegramId: id,
      };
    });

    const myWinsAllTime = allTimeWinMap[telegramId] || 0;
    const myGamesAllTime = allTimeGameCount[telegramId] || 0;
    const myIndexAllTime = allSortedIds.findIndex(id => id === telegramId);

    const myEntryAllTime = {
      name: user.name || "You",
      avatar: user.inventory?.equippedAvatar || null,
      rank:
        myWinsAllTime > 0
          ? myIndexAllTime + 1 > 100
            ? `Top ${Math.ceil((myIndexAllTime + 1) / 100) * 100}+`
            : myIndexAllTime + 1
          : "Not Ranked",
      wins: myWinsAllTime,
      totalGames: myGamesAllTime,
      telegramId,
    };

    result["byAllTime"] = allTimeLeaderboard;
    result["myAllTime"] = myEntryAllTime;

    // === Week & Month: keep previous logic ===
    for (const { key, from } of periods) {
      const duelGames = await prisma.duelGame.findMany({
        where: {
          //@ts-ignore
          createdAt: { gte: from },
        },
        select: {
          userId: true,
          status: true,
        },
      });

      const winMap: Record<string, number> = {};

      for (const game of duelGames) {
        const uid = game.userId!;
        if (game.status === "win") {
          winMap[uid] = (winMap[uid] || 0) + 1;
        }
      }

      const sortedIds = Object.keys(winMap).sort((a, b) => winMap[b] - winMap[a]);
      const topIds = sortedIds.slice(0, 100);
      const idsToFetch = Array.from(new Set([...topIds, telegramId])).filter(
        (id): id is string => id !== null
      );

      const users = await prisma.user.findMany({
        where: { telegramId: { in: idsToFetch } },
        include: { inventory: true },
      });

      const leaderboard = topIds.map((id, index) => {
        const u = users.find(u => u.telegramId === id);
        return {
          name: u?.name || "Unknown",
          avatar: u?.inventory?.equippedAvatar || null,
          rank: index + 1,
          wins: winMap[id] || 0,
          telegramId: id,
        };
      });

      const myWins = winMap[telegramId] || 0;
      const myRank = sortedIds.findIndex(id => id === telegramId);

      const myEntry = {
        name: user.name || "You",
        avatar: user.inventory?.equippedAvatar || null,
        rank:
          myWins > 0
            ? myRank + 1 > 100
              ? `Top ${Math.ceil((myRank + 1) / 100) * 100}+`
              : myRank + 1
            : "Not Ranked",
        wins: myWins,
        telegramId,
      };

      result[`by${key}`] = leaderboard;
      result[`my${key}`] = myEntry;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[LEADERBOARD_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
