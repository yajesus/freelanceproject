// app/api/user/route.ts

import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import {
  NEW_USER_BONUS_POINTS,
  NEW_USER_BONUS_STARS,
  REFERRAL_BONUS_BASE,
  REFERRAL_BONUS_PREMIUM,
  TELEGRAM_BOT_WELCOME_MESSAGE,
} from "@/utils/consts";
import { validateTelegramWebAppData } from "@/utils/server-checks";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ShopCategory } from "@prisma/client";
import { sendMessageToUser } from "@/utils/telegram";

// fallback mock helpers
const isMockMode =
  process.env.MOCK_MODE === "true" || process.env.NODE_ENV !== "production";
const mockDelay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { telegramInitData, referrerTelegramId } = body || {};

    console.log("📥 Incoming Telegram Init Data:", telegramInitData);
    console.log("📥 Referrer Telegram ID:", referrerTelegramId);

    if (!telegramInitData) {
      // ✅ MOCK response when Telegram data not provided
      if (isMockMode) {
        console.warn("⚠️ Missing telegramInitData, returning mock user.");
        await mockDelay(300);
        return NextResponse.json({
          id: "mock-user-1",
          telegramId: "999999",
          name: "Test User",
          isPremium: false,
          points: 100,
          pointsBalance: 100,
          totalStars: 5,
          referralCount: 0,
          completedTasksCount: 0,
          onChainCount: 0,
          message: "⚙️ Mock user created successfully (no Telegram data)",
        });
      }

      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // ✅ Try to validate real Telegram data
    let validatedData: any = null;
    let telegramUser: any = null;
    try {
      const result = validateTelegramWebAppData(telegramInitData);
      validatedData = result.validatedData;
      telegramUser = result.user;
    } catch (err) {
      console.error("❌ Telegram data validation failed:", err);
    }

    // if invalid but in mock mode, fallback
    if (!validatedData && isMockMode) {
      console.warn("⚠️ Telegram validation failed — using mock data instead.");
      telegramUser = {
        id: "999999",
        first_name: "MockUser",
        is_premium: false,
      };
      validatedData = { mock: true };
    }

    if (!validatedData) {
      return NextResponse.json(
        { error: "Invalid Telegram data" },
        { status: 403 }
      );
    }

    const telegramId = telegramUser.id?.toString();
    if (!telegramId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
    }

    // ========== MOCK DATABASE MODE ==========
    if (isMockMode) {
      console.log("💾 Using mock Prisma logic...");
      await mockDelay(500);

      const mockUser = {
        id: "mock-uuid",
        telegramId,
        name: telegramUser.first_name,
        isPremium: telegramUser.is_premium || false,
        points: NEW_USER_BONUS_POINTS,
        pointsBalance: NEW_USER_BONUS_POINTS,
        totalStars: NEW_USER_BONUS_STARS,
        referralCount: referrerTelegramId ? 1 : 0,
        completedTasksCount: 0,
        onChainCount: 0,
        inventory: {
          equippedAvatarName: "default-avatar.png",
          equippedBackgroundName: "default-bg.png",
        },
        message: "✅ Mock user created successfully.",
      };

      return NextResponse.json(mockUser, { status: 200 });
    }

    // ========== REAL DATABASE LOGIC ==========
    const dbUserUpdated = await prisma.$transaction(
      async (prisma) => {
        let dbUser = await prisma.user.findUnique({
          where: { telegramId },
          include: {
            referredBy: true,
            referrals: true,
            completedTasks: true,
            userUpgrades: true,
            inventory: { include: { items: { include: { shopItem: true } } } },
          },
        });

        const currentTime = new Date();

        if (!dbUser) {
          console.log("🆕 Creating new user...");
          let referredByUser = null;
          if (referrerTelegramId) {
            referredByUser = await prisma.user.findUnique({
              where: { telegramId: referrerTelegramId },
            });
          }

          const isPremium = telegramUser?.is_premium || false;
          const referralBonus = referredByUser
            ? isPremium
              ? REFERRAL_BONUS_PREMIUM
              : REFERRAL_BONUS_BASE
            : 0;

          const basicAvatar = await prisma.shopItem.findFirst({
            where: { category: ShopCategory.AVATAR, isBasic: true },
          });
          const basicBackground = await prisma.shopItem.findFirst({
            where: { category: ShopCategory.BACKGROUND, isBasic: true },
          });

          const inventoryCreateData: any = {
            create: {
              ...(basicAvatar && {
                equippedAvatar: basicAvatar.id,
                equippedAvatarName: basicAvatar.image,
              }),
              ...(basicBackground && {
                equippedBackground: basicBackground.id,
                equippedBackgroundName: basicBackground.image,
              }),
              items: {
                create: [
                  ...(basicAvatar
                    ? [{ shopItem: { connect: { id: basicAvatar.id } } }]
                    : []),
                  ...(basicBackground
                    ? [{ shopItem: { connect: { id: basicBackground.id } } }]
                    : []),
                ],
              },
            },
          };

          dbUser = await prisma.user.create({
            data: {
              telegramId,
              name: telegramUser?.first_name || "",
              isPremium,
              points: referralBonus + NEW_USER_BONUS_POINTS,
              pointsBalance: referralBonus + NEW_USER_BONUS_POINTS,
              totalStars: NEW_USER_BONUS_STARS,
              earnedStars: NEW_USER_BONUS_STARS,
              referralPointsEarned: referralBonus,
              lastPointsUpdateTimestamp: currentTime,
              lastUpgradeYieldTimestamp: currentTime,
              referredBy: referredByUser
                ? { connect: { id: referredByUser.id } }
                : undefined,
              inventory: inventoryCreateData,
              fakeFriends: 0,
            },
            include: {
              referredBy: true,
              referrals: true,
              completedTasks: true,
              userUpgrades: true,
              inventory: {
                include: { items: { include: { shopItem: true } } },
              },
            },
          });

          if (referredByUser) {
            await prisma.user.update({
              where: { id: referredByUser.id },
              data: {
                points: { increment: referralBonus },
                pointsBalance: { increment: referralBonus },
                referrals: { connect: { id: dbUser.id } },
              },
            });
          }

          await sendMessageToUser(
            Number(telegramId),
            TELEGRAM_BOT_WELCOME_MESSAGE
          );
        }

        return dbUser;
      },
      { maxWait: 5000, timeout: 15000 }
    );

    return NextResponse.json(dbUserUpdated, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching/creating user:", error);
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch/create user" },
      { status: 500 }
    );
  }
}
