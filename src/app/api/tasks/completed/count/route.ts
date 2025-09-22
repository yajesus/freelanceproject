// app/api/tasks/completed/count/route.ts

import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { validateTelegramWebAppData } from "@/utils/server-checks";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const telegramInitData = url.searchParams.get("initData");

  if (!telegramInitData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

  if (!validatedData) {
    return NextResponse.json(
      { error: "Invalid Telegram data" },
      { status: 403 },
    );
  }

  const telegramId = user.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
  }

  try {
    // Fetch the user
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch valid UserTask entries for this user, only for active tasks
    const count = await prisma.userTask.count({
      where: {
        userId: user.id,
        task: {
          isNot: undefined,
          isActive: true,
        },
        isCompleted: true,
      },
    });

    // Prepare the response data

    return NextResponse.json({
      count,
    });
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch user completed tasks count" },
      { status: 500 },
    );
  }
}
