const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const os = require("os"); // ✅ added to detect LAN IP

const app = express();
app.use(cors());
app.use(express.json());

// Store orders in memory (replace with DB later if needed)
let orders = [];

// Create HTTP + WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Function to broadcast new orders to all connected dashboards
function broadcastOrder(order) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(order));
    }
  });
}

// ✅ API route: frontend calls this to submit order
app.post("/api/order", (req, res) => {
  const order = {
    id: orders.length + 1,
    items: req.body.items || [],
    total: req.body.total || 0,
  };
  orders.push(order);

  // Broadcast to dashboards
  broadcastOrder(order);

  res.status(201).json(order);
});

// ✅ API route: dashboard can fetch existing orders
app.get("/api/order", (req, res) => {
  res.json(orders);
});

// WebSocket connection setup
wss.on("connection", (ws) => {
  console.log("📡 Dashboard connected via WebSocket");

  // Optionally send existing orders when they connect
  ws.send(JSON.stringify({ type: "init", orders }));

  ws.on("close", () => {
    console.log("❌ Dashboard disconnected");
  });
});

// Start server
const PORT = 3001;
const HOST = "0.0.0.0"; // bind to all network interfaces
server.listen(PORT, HOST, () => {
  // ✅ Detect LAN IP
  const networkInterfaces = os.networkInterfaces();
  let lanIP = "localhost";
  for (const iface of Object.values(networkInterfaces)) {
    for (const net of iface) {
      if (net.family === "IPv4" && !net.internal) {
        lanIP = net.address;
      }
    }
  }

  console.log(`🚀 Server running on:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${lanIP}:${PORT}`);
});
