import { NextResponse } from 'next/server';
import { getWebSocketServer } from '@/lib/websocketServer';

export async function GET() {
  console.log('[WS API] 📥 GET /api/ws called');

  // Initialize WebSocket server (starts it if not already running)
  console.log('[WS API] 🚀 Initializing WebSocket server...');
  getWebSocketServer();
  console.log('[WS API] ✅ WebSocket server initialized');

  // Trigger handler registration by importing the online route
  // This ensures handlers are registered when WebSocket server is accessed
  console.log('[WS API] 📦 Importing online route to register handlers...');
  await import('../online/route');
  console.log('[WS API] ✅ Online route imported');

  console.log('[WS API] 📤 Returning success response');
  return NextResponse.json({ ok: true });
}
