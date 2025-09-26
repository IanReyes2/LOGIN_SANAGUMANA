import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import os from "os";

const app = express();

// ✅ Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json()); // parse JSON bodies

// Store orders in memory
let orders = [];

// Create HTTP + WebSocket server
export const server = http.createServer(app);
export const wss = new WebSocketServer({ server });

// Detect LAN IP
const networkInterfaces = os.networkInterfaces();
let lanIP = "localhost";
for (const iface of Object.values(networkInterfaces)) {
  for (const net of iface || []) {
    if (net.family === "IPv4" && !net.internal) {
      lanIP = net.address;
    }
  }
}

// ✅ Broadcast helper
function broadcastOrder(payload) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

// ✅ Clear all orders
app.delete("/api/order/clear", (req, res) => {
  orders = [];
  broadcastOrder({ type: "clear" });
  res.json({ success: true, message: "All orders cleared" });
});

// ✅ POST new order
app.post("/api/order", (req, res) => {
  const { items, total, orderCode, createdAt } = req.body || {};

  if (!items || !Array.isArray(items) || typeof total !== "number" || !orderCode) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  const order = {
    id: orders.length + 1,
    orderCode,
    items,
    total,
    status: "pending",
    createdAt: createdAt || new Date().toISOString(),
  };

  orders.push(order);

  broadcastOrder({ type: "new_order", order });

  res.status(201).json(order);
});


// ✅ GET all orders
app.get("/api/order", (req, res) => {
  res.json(orders);
});

// ✅ PATCH order status
app.patch("/api/order/:id", (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { status } = req.body;

  const order = orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = status;

  // Broadcast status update
  broadcastOrder({ type: "status_update", order });

  res.json(order);
});

// ✅ WebSocket connection
wss.on("connection", (ws) => {
  console.log("📡 Dashboard connected via WebSocket");

  // Send existing orders on connect
  ws.send(JSON.stringify({ type: "init", orders }));

  ws.on("close", () => console.log("❌ Dashboard disconnected"));
});

// ✅ Start server
const PORT = 3001;
const HOST = "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`   Network: http://${lanIP}:${PORT}`);
});
