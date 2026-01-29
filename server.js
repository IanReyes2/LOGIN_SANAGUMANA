// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import os from "os";
import cors from "cors";
import bodyParser from "body-parser";
import { prisma } from "./lib/prisma.js";

// -----------------------
// Express HTTP Server
// -----------------------
const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:3006",
  "http://192.168.254.113:3006",
  "http://localhost:3000",
  "http://192.168.254.113:3000",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ FIX: Node 24–safe wildcard
app.options(/.*/, (_req, res) => res.sendStatus(204));

app.use(bodyParser.json());

// -----------------------
// Health Check
// -----------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// -----------------------
// API Routes
// -----------------------

// GET all pending orders
app.get("/api/order", async (_req, res) => {
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

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: "Order must include at least one item" });
    }

    if (!body.customerName) body.customerName = body.customer ?? "Kiosk";

    for (const it of body.items) {
      if (
        typeof it.name !== "string" ||
        typeof it.unitPrice !== "number" ||
        typeof it.qty !== "number"
      ) {
        return res.status(400).json({
          error: "Each item must have name (string), unitPrice (number), qty (number)",
        });
      }
    }

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

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "new_order", order }));
      }
    });

    res.json(order);
  } catch (err) {
    console.error("POST /api/order error:", err);
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

// DELETE single order
app.delete("/api/order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "order_removed", orderId: id }));
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// DELETE all pending orders
app.delete("/api/order", async (_req, res) => {
  try {
    await prisma.order.updateMany({
      where: { status: "pending" },
      data: { status: "confirmed" },
    });

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "clear" }));
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear queue" });
  }
});

// -----------------------
// HTTP + WebSocket Server
// -----------------------
export const server = http.createServer(app);
export const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("📡 Dashboard connected via WebSocket");
  ws.on("close", () => console.log("❌ Dashboard disconnected"));
});

// LAN IP
const nets = os.networkInterfaces();
let lanIP = "localhost";
for (const iface of Object.values(nets)) {
  for (const net of iface || []) {
    if (net.family === "IPv4" && !net.internal) lanIP = net.address;
  }
}

const PORT = 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://${lanIP}:${PORT}`);
  console.log(`🚀 WebSocket server: ws://${lanIP}:${PORT}`);
});
