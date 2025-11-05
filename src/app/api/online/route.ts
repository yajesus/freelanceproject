import prisma from '@/utils/prisma';
import { NextResponse } from 'next/server';
import {
  getWebSocketServer,
  registerMessageHandler,
  updateClientInfo,
  broadcast,
} from '@/lib/websocketServer';

let onlineCountInterval: NodeJS.Timeout | null = null;
let isHandlersRegistered = false;

function getLocalNow(): Date {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000);
}

async function calculateOnlineCount(): Promise<number> {
  const localNow = getLocalNow();
  const twoMinAgo = new Date(localNow.getTime() - 2 * 60 * 1000);

  // Count from database (users with lastSeenAt in last 2 minutes)
  const dbCount = await prisma.user.count({
    where: { lastSeenAt: { gte: twoMinAgo, lte: localNow } },
  });

  // Also count connected WebSocket clients with recent heartbeats
  const { getConnectedClients } = await import('@/lib/websocketServer');
  const connectedClients = getConnectedClients();
  const now = Date.now();
  const heartbeatTimeout = 2 * 60 * 1000; // 2 minutes

  let wsCount = 0;
  const seenTelegramIds = new Set<string>();

  connectedClients.forEach((clientInfo, ws) => {
    // Only count clients that have sent a heartbeat with a telegramId
    if (clientInfo.telegramId && clientInfo.lastHeartbeat) {
      const timeSinceHeartbeat = now - clientInfo.lastHeartbeat;

      // Only count if heartbeat was within last 2 minutes
      if (timeSinceHeartbeat <= heartbeatTimeout) {
        // Deduplicate by telegramId (in case multiple connections from same user)
        if (!seenTelegramIds.has(clientInfo.telegramId)) {
          seenTelegramIds.add(clientInfo.telegramId);
          wsCount++;
        }
      }
    }
  });

  // Use the maximum of database count and WebSocket count
  // This ensures we count both DB-tracked users and active WebSocket connections
  return Math.max(dbCount, wsCount);
}

async function updateOnlineCount(): Promise<void> {
  try {
    const count = await calculateOnlineCount();

    broadcast({
      type: 'onlineCount',
      count,
    });
  } catch (error) {
    console.error('Error updating online count:', error);
  }
}

async function updateUserLastSeen(telegramId: string): Promise<void> {
  try {
    // Skip database update for local development IDs
    if (telegramId.startsWith('local-dev-')) {
      return;
    }

    const localNow = getLocalNow();
    await prisma.user.update({
      where: { telegramId },
      data: { lastSeenAt: localNow },
    });
  } catch (error) {
    console.error(`Error updating user lastSeenAt for ${telegramId}:`, error);
    // Don't throw - allow the heartbeat to continue even if DB update fails
  }
}

function registerOnlineHandlers(): void {
  if (isHandlersRegistered) {
    return;
  }

  // Ensure WebSocket server is initialized
  getWebSocketServer();

  // Register heartbeat handler
  registerMessageHandler('heartbeat', async (ws, data, clientInfo) => {
    const { telegramId } = data;

    if (!telegramId) {
      return;
    }

    // Update client info
    updateClientInfo(ws, {
      telegramId,
      lastHeartbeat: Date.now(),
    });

    // Update lastSeenAt in database
    await updateUserLastSeen(telegramId);

    // Send acknowledgment
    ws.send(JSON.stringify({ type: 'heartbeatAck' }));

    // Trigger online count update
    updateOnlineCount();
  });

  // Start online count polling if not already started
  if (!onlineCountInterval) {
    // Update immediately
    updateOnlineCount();

    // Then update every 5 seconds
    onlineCountInterval = setInterval(() => {
      updateOnlineCount();
    }, 5000);
  }

  isHandlersRegistered = true;
}

// Initialize handlers when module loads (but only once)
if (typeof window === 'undefined') {
  registerOnlineHandlers();
}

export async function GET(req: Request) {
  // Ensure handlers are registered
  registerOnlineHandlers();

  const count = await calculateOnlineCount();

  return NextResponse.json({
    success: true,
    data: count,
  });
}

// Keep POST endpoint for backward compatibility (though WebSocket heartbeat is preferred)
export async function POST(req: Request) {
  registerOnlineHandlers();

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  await updateUserLastSeen(userId);

  return NextResponse.json({ success: true });
}
