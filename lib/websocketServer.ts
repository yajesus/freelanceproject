import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer | null = null;

export interface ClientInfo {
  telegramId?: string;
  lastHeartbeat?: number;
  [key: string]: any; // Allow additional custom properties
}

export interface MessageHandler {
  type: string;
  handler: (
    ws: WebSocket,
    data: any,
    clientInfo: ClientInfo
  ) => Promise<void> | void;
}

const messageHandlers = new Map<string, MessageHandler['handler']>();
const connectedClients = new Map<WebSocket, ClientInfo>();

export function getWebSocketServer(): WebSocketServer {
  if (!wss) {
    wss = new WebSocketServer({ port: 8080 });
    console.log('✅ WebSocket Server running on ws://localhost:8080');

    wss.on('connection', (ws: WebSocket) => {
      connectedClients.set(ws, {});

      const welcomeMsg = JSON.stringify({
        type: 'connected',
        message: 'Welcome!',
      });
      ws.send(welcomeMsg);

      ws.on('message', async (data: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(data.toString());
          const handler = messageHandlers.get(parsed.type);
          const clientInfo = connectedClients.get(ws) || {};

          if (handler) {
            await handler(ws, parsed, clientInfo);
          }
        } catch (err) {
          console.error('WebSocket error parsing message:', err);
        }
      });

      ws.on('close', () => {
        connectedClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        connectedClients.delete(ws);
      });
    });
  }

  return wss;
}

/**
 * Register a message handler for a specific message type
 * @param type - The message type to handle
 * @param handler - The handler function
 */
export function registerMessageHandler(
  type: string,
  handler: MessageHandler['handler']
): void {
  messageHandlers.set(type, handler);
}

/**
 * Unregister a message handler
 * @param type - The message type to unregister
 */
export function unregisterMessageHandler(type: string): void {
  messageHandlers.delete(type);
}

/**
 * Broadcast a message to all connected clients
 * @param message - The message object to broadcast (will be JSON stringified)
 */
export function broadcast(message: any): void {
  const messageStr = JSON.stringify(message);
  wss?.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

/**
 * Get all connected clients
 */
export function getConnectedClients(): Map<WebSocket, ClientInfo> {
  return connectedClients;
}

/**
 * Update client info for a specific WebSocket connection
 */
export function updateClientInfo(
  ws: WebSocket,
  info: Partial<ClientInfo>
): void {
  const currentInfo = connectedClients.get(ws) || {};
  connectedClients.set(ws, { ...currentInfo, ...info });
}
