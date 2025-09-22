import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { validateTelegramWebAppData } from "@/utils/server-checks";

export async function POST(req: Request) {
  try {
    const { initData, newYield } = await req.json();

    if (!initData || typeof newYield !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(initData);

    if (!validatedData || !user?.id) {
      return NextResponse.json(
        { error: "Invalid Telegram data" },
        { status: 403 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { telegramId: user.id.toString() },
      data: {
        yieldPerHour: newYield,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Yield updated to ${newYield} per hour`,
      yieldPerHour: updatedUser.yieldPerHour,
    });
  } catch (error) {
    console.error("Error setting yieldPerHour:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
