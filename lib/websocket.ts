import { WebSocketServer, WebSocket } from "ws";
import http from "http";

let wss: WebSocketServer | null = null;

export function initWebSocket(server: http.Server): WebSocketServer {
  if (wss) return wss;

  wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("📡 Dashboard connected via WebSocket");
  });

  return wss;
}

// Broadcast helper
export function broadcast(payload: any) {
  if (!wss) return;

  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

export { wss };
