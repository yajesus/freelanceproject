// app/api/license/route.ts



import { NextResponse } from 'next/server';

const licenseInfo = `
This project was developed by JOKInTheBox.

Website: https://jokinthebox.com/
Telegram channel: https://t.me/JokInTheBox_AI_Labs_Portal
`;

export async function GET(req: Request) {
  return NextResponse.json({ 
    license: licenseInfo.trim(),
    version: '1.0.0',
    lastUpdated: '2024-08-20'
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}