// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import os from "os";
import cors from "cors";
import bodyParser from "body-parser";
import { prisma } from "./lib/prisma.ts"; // make sure path is correct

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

    // ---------- Logging incoming request ----------
    console.log("POST /api/order body:", JSON.stringify(body, null, 2));

    // ---------- Basic validation ----------
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: "Order must include at least one item" });
    }

    if (!body.customerName) {
      body.customerName = body.customer ?? "Kiosk";
    }

    for (const it of body.items) {
      if (typeof it.name !== "string" || typeof it.unitPrice !== "number" || typeof it.qty !== "number") {
        return res.status(400).json({
          error: "Each item must have name (string), unitPrice (number), qty (number)"
        });
      }
    }

    // ---------- Create order in Prisma ----------
    const order = await prisma.order.create({
      data: {
        customer: body.customer ?? "Guest",
        customerName: body.customerName,
        total: body.total,
        orderCode: body.orderCode,
        tableNumber: body.tableNumber ?? null,
        orderType: body.orderType ?? "kiosk",
        createdAt: body.createdAt ? new Date(body.createdAt) : undefined,
        items: {
          create: body.items.map((item) => ({
            name: item.name,
            price: Number(item.unitPrice),
            quantity: Number(item.qty),
          })),
        },
      },
      include: { items: true },
    });

    // ✅ Broadcast new order to all connected dashboards
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "new_order", order }));
      }
    });

    // ---------- Respond ----------
    res.json(order);
  } catch (err) {
    console.error("Error in POST /api/order:", err);
    let message = "Failed to create order";
    if (err?.message) message += `: ${err.message}`;
    res.status(500).json({ error: message });
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
      if (client.readyState === 1) {
        if (updatedOrder.status === "confirmed") {
          client.send(JSON.stringify({ type: "status_update", order: updatedOrder }));
        } else if (updatedOrder.status === "served") {
          client.send(JSON.stringify({ type: "order_removed", orderId: updatedOrder.id }));
        }
      }
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
