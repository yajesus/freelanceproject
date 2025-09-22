// src/app/api/twitter/auth/route.ts
import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY!,
  appSecret: process.env.TWITTER_CONSUMER_SECRET!,
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get('redirectTo') || '/';
  const userAgent = req.headers.get('user-agent') || '';
  const isTelegram = userAgent.includes('Telegram');

  const callbackUrl = isTelegram
    ? `${process.env.NEXTAUTH_URL}/api/twitter/callback?redirectTo=${encodeURIComponent(redirectTo)}`
    : `${process.env.NEXTAUTH_URL}/api/twitter/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

  const authLink = await client.generateAuthLink(callbackUrl);

  const response = isTelegram
    ? NextResponse.json({ url: authLink.url })
    : NextResponse.redirect(authLink.url);

  if (!isTelegram) {
    response.cookies.set("oauth_token_secret", authLink.oauth_token_secret, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    response.cookies.set("telegram_oauth_temp", JSON.stringify({
      oauth_token: authLink.oauth_token,
      oauth_token_secret: authLink.oauth_token_secret,
      redirectTo
    }), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 5
    });
  }

  return response;
}
