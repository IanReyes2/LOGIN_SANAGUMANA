// server.js
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import os from "os";

export const server = http.createServer();
export const wss = new WebSocketServer({ server });

const networkInterfaces = os.networkInterfaces();
let lanIP = "localhost";
for (const iface of Object.values(networkInterfaces)) {
  for (const net of iface || []) {
    if (net.family === "IPv4" && !net.internal) {
      lanIP = net.address;
    }
  }
}

wss.on("connection", (ws) => {
  console.log("📡 Dashboard connected via WebSocket");
  ws.on("close", () => console.log("❌ Dashboard disconnected"));
});

const PORT = 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 WebSocket server: ws://${lanIP}:${PORT}`);
});
