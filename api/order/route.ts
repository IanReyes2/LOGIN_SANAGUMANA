import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/websocket";

// GET all pending orders
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { items: true }, // only include OrderItem
    });

    // Normalize for frontend
    const normalized = orders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode ?? `#${o.id.slice(0, 6)}`,
      customerName: o.customerName,
      customer: o.customer,
      tableNumber: o.tableNumber,
      orderType: o.orderType,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        notes: i.notes ?? null,
      })),
    }));

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

    broadcast({ type: "new_order", order });

    return NextResponse.json(order);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

// DELETE all pending orders (mark as served)
export async function DELETE() {
  try {
    const updatedOrders = await prisma.order.updateMany({
      where: { status: "pending" },
      data: { status: "served" },
    });

    const servedOrders = await prisma.order.findMany({
      where: { status: "served" },
      include: { items: true },
    });

    broadcast({ type: "clear", orders: servedOrders });

    return NextResponse.json({ success: true, updatedCount: updatedOrders.count });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to clear orders" }, { status: 500 });
  }
}
