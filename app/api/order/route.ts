import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/websocket";

// Helper to format timestamp
function formatTimestamp(date: Date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

// Normalize order for frontend
function normalizeOrder(order: any) {
  return {
    id: order.id,
    orderCode: order.orderCode ?? `#${order.id.slice(0, 6)}`,
    customerName: order.customerName,
    customer: order.customer,
    tableNumber: order.tableNumber,
    orderType: order.orderType,
    status: order.status,
    total: order.total,
    createdAt: formatTimestamp(order.createdAt),
    updatedAt: formatTimestamp(order.updatedAt),
    processingTime: order.processingTime ?? null,
    items: order.items.map((i: any) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      notes: i.notes ?? null,
    })),
  };
}

// GET all pending orders
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { items: true },
    });

    const normalized = orders.map(normalizeOrder);
    return NextResponse.json(normalized);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST new order
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const order = await prisma.order.create({
      data: {
        customer: body.customer,
        customerName: body.customerName ?? body.customer,
        tableNumber: body.tableNumber ?? null,
        orderType: body.orderType ?? "dine-in",
        total: body.total,
        orderCode: body.orderCode ?? undefined,
        items: {
          create: body.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes ?? null,
          })),
        },
      },
      include: { items: true },
    });

    broadcast({ type: "new_order", order: normalizeOrder(order) });
    return NextResponse.json(normalizeOrder(order));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

// DELETE all pending orders (mark as served)
export async function DELETE() {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: { status: "pending" },
      include: { items: true },
    });

    // Calculate processingTime for each before updating
    const updates = pendingOrders.map((order) => {
      const diffMs = new Date().getTime() - order.createdAt.getTime();
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      const processingTime = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
      return prisma.order.update({
        where: { id: order.id },
        data: { status: "confirmed", processingTime },
      });
    });

    const updatedOrders = await Promise.all(updates);

    broadcast({ type: "clear", orders: updatedOrders.map(normalizeOrder) });

    return NextResponse.json({ success: true, updatedCount: updatedOrders.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to clear orders" }, { status: 500 });
  }
}