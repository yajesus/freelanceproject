import prisma from "@/utils/prisma";
import { NextResponse } from "next/server";

const now = new Date();
const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

export async function GET(req: Request) {
  const twoMinAgo = new Date(localNow.getTime() - 2 * 60 * 1000);

  const count = await prisma.user.count({
    where: { lastSeenAt: { gte: twoMinAgo, lte: localNow } },
  });

  return NextResponse.json({
    success: true,
    data: count,
  });
}

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { telegramId: userId },
    data: {
      lastSeenAt: localNow,
    },
  });

  return NextResponse.json({ success: true });
  //   const res = await fetch("/online");
  //   const data = await res.json();

  //   return NextResponse.json({ success: true, data: data });
}
