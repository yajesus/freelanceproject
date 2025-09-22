import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { validateTelegramWebAppData } from "@/utils/server-checks";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { generateChestReward } from "@/utils/generateChestReward";

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

interface ChestClaimResult {
  prizeType: string;
  prizeData: any;
  claimedAt: Date;
}

// ✅ POST: Claim chest
export async function POST(req: Request) {
  const { initData: telegramInitData } = await req.json();

  if (!telegramInitData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

  if (!validatedData) {
    return NextResponse.json(
      { error: "Invalid Telegram data" },
      { status: 403 }
    );
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const result = await prisma.$transaction<ChestClaimResult | null>(
        async (prisma) => {
          const lastClaim = await prisma.userChestReward.findFirst({
            where: { userId: telegramId },
            orderBy: { claimedAt: "desc" },
          });

          const now = new Date();

          if (
            lastClaim &&
            now.getTime() - new Date(lastClaim.claimedAt).getTime() <
              24 * 60 * 60 * 1000
          ) {
            throw new Error("Chest already claimed in the last 24 hours");
          }

          const reward = generateChestReward();

          const created = await prisma.userChestReward.create({
            data: {
              userId: telegramId,
              prizeType: reward.type,
              prizeData: reward.result,
            },
          });

          return {
            prizeType: created.prizeType,
            prizeData: created.prizeData,
            claimedAt: created.claimedAt,
          };
        }
      );

      if (result === null) {
        retries++;
        if (retries >= MAX_RETRIES) {
          return NextResponse.json(
            { error: "Failed to claim chest after multiple attempts" },
            { status: 500 }
          );
        }
        await new Promise((res) =>
          setTimeout(res, RETRY_DELAY * Math.pow(2, retries))
        );
        continue;
      }

      return NextResponse.json({
        success: true,
        prizeType: result.prizeType,
        prizeData: result.prizeData,
        claimedAt: result.claimedAt,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        retries++;
        await new Promise((res) =>
          setTimeout(res, RETRY_DELAY * Math.pow(2, retries))
        );
      } else {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Chest claim failed",
          },
          { status: 400 }
        );
      }
    }
  }

  return NextResponse.json({ error: "Chest claim failed" }, { status: 500 });
}

// ✅ GET: Check next available chest time
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const initDataRaw = searchParams.get("initData");

    if (!initDataRaw) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const initData = decodeURIComponent(initDataRaw);
    const { validatedData, user } = validateTelegramWebAppData(initData);

    if (!validatedData || !user.id) {
      return NextResponse.json(
        { error: "Invalid Telegram data" },
        { status: 403 }
      );
    }

    const telegramId = user.id.toString();
    const now = new Date();

    const lastClaim = await prisma.userChestReward.findFirst({
      where: { userId: telegramId },
      orderBy: { claimedAt: "desc" },
    });

    const nextClaimTime = lastClaim
      ? new Date(lastClaim.claimedAt.getTime() + 24 * 60 * 60 * 1000)
      : null;

    const remainingMs = nextClaimTime
      ? Math.max(0, nextClaimTime.getTime() - now.getTime())
      : 0;

    return NextResponse.json({
      success: true,
      currentTime: now,
      lastClaimedAt: lastClaim?.claimedAt ?? null,
      nextClaimTime,
      remainingMs,
      canClaim: remainingMs <= 0,
    });
  } catch (error) {
    console.error("GET /api/chest/claim error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chest status" },
      { status: 500 }
    );
  }
}
