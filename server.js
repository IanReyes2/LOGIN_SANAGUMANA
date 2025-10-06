// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import os from "os";
import cors from "cors";
import bodyParser from "body-parser";
import { prisma } from "./lib/prisma"; // make sure path is correct

// ------------------- Express HTTP Server -------------------
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ------------------- API Routes -------------------

// GET all pending orders
app.get("/api/order", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: "pending" },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST a new order
app.post("/api/order", async (req, res) => {
  try {
    const body = req.body;

    const order = await prisma.order.create({
      data: {
        customer: body.customer,
        customerName: body.customerName ?? body.customer,
        total: body.total,
        orderCode: body.orderCode ?? undefined,
        tableNumber: body.tableNumber ?? null,
        orderType: body.orderType ?? "kiosk",
        items: {
          create: body.items.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes ?? null,
          })),
        },
      },
      include: { items: true },
    });

    // Broadcast new order to all WS clients
    wss.clients.forEach((client) => {
      if (client.readyState === 1)
        client.send(JSON.stringify({ type: "new_order", order }));
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// PATCH order status
app.patch("/api/order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: "Missing status" });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    // Broadcast status update
    wss.clients.forEach((client) => {
      if (client.readyState === 1)
        client.send(JSON.stringify({ type: "status_update", order: updatedOrder }));
    });

    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// DELETE an order
app.delete("/api/order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.order.delete({ where: { id } });

    // Broadcast removal
    wss.clients.forEach((client) => {
      if (client.readyState === 1)
        client.send(JSON.stringify({ type: "order_removed", orderId: id }));
    });

    res.json({ success: true, orderId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// ------------------- HTTP + WebSocket Server -------------------
export const server = http.createServer(app);
export const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("📡 Dashboard connected via WebSocket");

  ws.on("close", () => console.log("❌ Dashboard disconnected"));
});

// ------------------- LAN IP Detection -------------------
const networkInterfaces = os.networkInterfaces();
let lanIP = "localhost";
for (const iface of Object.values(networkInterfaces)) {
  for (const net of iface || []) {
    if (net.family === "IPv4" && !net.internal) {
      lanIP = net.address;
    }
  }
}

const PORT = 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://${lanIP}:${PORT}`);
  console.log(`🚀 WebSocket server: ws://${lanIP}:${PORT}`);
});
