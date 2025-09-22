// src/app/api/twitter/callback/route.ts
import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import { cookies } from "next/headers";


function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const oauth_token = url.searchParams.get("oauth_token");
  const oauth_verifier = url.searchParams.get("oauth_verifier");
  const redirectTo = url.searchParams.get("redirectTo") || "/";
  const cookieStore = cookies();

  const userAgent = req.headers.get('user-agent') || '';
  const isTelegram = userAgent.includes('Telegram');

  let oauth_token_secret: string | undefined;

  if (isTelegram) {
    const tempAuth = cookieStore.get("telegram_oauth_temp")?.value;
    if (!tempAuth) {
      return NextResponse.json({ error: "Missing temporary auth data" }, { status: 400 });
    }
    const tempData = JSON.parse(tempAuth);
    oauth_token_secret = tempData.oauth_token_secret;
  } else {
    oauth_token_secret = cookieStore.get("oauth_token_secret")?.value;
  }

  if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
    return NextResponse.json({ error: "Missing or invalid oauth tokens" }, { status: 400 });
  }

  const client = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY!,
    appSecret: process.env.TWITTER_CONSUMER_SECRET!,
    accessToken: oauth_token,
    accessSecret: oauth_token_secret,
  });

  try {
    const { accessToken, accessSecret, userId, screenName } = await client.login(oauth_verifier);
    
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const finalRedirect = new URL(redirectTo, baseUrl);

    if (isTelegram) {
      // For Telegram browser, set cookies and redirect
      const response = NextResponse.redirect(finalRedirect);
      response.cookies.set("twitter_access_token", accessToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      response.cookies.set("twitter_access_secret", accessSecret, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      response.cookies.set("twitter_user_id", userId, { path: "/" });
      response.cookies.set("twitter_screen_name", screenName, { path: "/" });

      return response;
    } else {
      const rawPayload = `twitter_${accessToken}_${accessSecret}_${userId}_${screenName}`;
      const startPayload = base64urlEncode(rawPayload);
      // For non-Telegram browsers, open Telegram with the callback URL
      // const tgUrl = `tg://resolve?domain=${process.env.TELEGRAM_BOT_USERNAME}&start=${encodeURIComponent(`twitter_${accessToken}_${accessSecret}_${userId}_${screenName}`)}`;
      const tgUrl = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?startapp=${encodeURIComponent(startPayload)}`;

      const tgDeepLink = `tg://resolve?domain=${process.env.TELEGRAM_BOT_USERNAME}&startapp=${encodeURIComponent(startPayload)}`;
      const tgHttpLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?startapp=${encodeURIComponent(startPayload)}`;
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting to Telegram</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <script>
              (function() {
                const tgDeepLink = "${tgDeepLink}";
                const tgHttpLink = "${tgHttpLink}";
                const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
                const isAndroid = /android/i.test(navigator.userAgent);

                // Try to open tg:// using iframe (Android-friendly)
                if (isAndroid) {
                  const iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  iframe.src = tgDeepLink;
                  document.body.appendChild(iframe);
                } else if (isIOS) {
                  // Use window.location for iOS
                  window.location = tgDeepLink;
                }

                // Fallback after 1.5s
                setTimeout(() => {
                  window.location.href = tgHttpLink;
                }, 1500);
              })();
            </script>
          </head>
          <body>
            <p>Redirecting to Telegram...</p>
            <p>If you are not redirected automatically, <a href="${tgUrl}">click here</a>.</p>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  } catch (error) {

    console.error("Twitter callback error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Twitter" },
      { status: 500 }
    );
  }
}