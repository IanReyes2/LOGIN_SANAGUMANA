// app/api/order/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wss } from "../../server"; // import the WebSocket server

interface OrderItemType {
  name: string;
  price: number;
  quantity: number;
}

interface OrderType {
  id: string;
  orderCode?: string | null;
  createdAt?: Date | null;
  status: string;
  total: number;
  items: OrderItemType[];
}

// normalize Prisma Order object for frontend
function normalizeOrder(o: OrderType) {
  return {
    id: o.id,
    orderCode: o.orderCode ?? `IU${String(o.id).slice(0, 6)}`, // fallback
    createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
    status: o.status,
    total: o.total,
    items: (o.items || []).map((i) => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
  };
}

// GET all orders, only those for canteen
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: "canteen" },
      orderBy: { createdAt: "asc" },
      include: { items: true },
    });
    const normalized = orders.map(normalizeOrder);
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST new order from kiosk
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: OrderItemType[] = body.items || [];

    const newOrder = await prisma.order.create({
      data: {
        orderCode: body.code ?? undefined,              // kiosk-generated code
        createdAt: body.date ? new Date(body.date) : undefined,
        status: body.status ?? "pending",
        total: body.total,
        customer: body.customer ?? "Guest",
        customerName: body.customerName ?? "Guest",
        tableNumber: body.tableNumber ?? null,
        orderType: body.orderType ?? "dine-in",
        items: {
          create: items.map((i) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    const normalized = normalizeOrder(newOrder);

    // ✅ Broadcast new order to all connected dashboards
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "new_order", order: normalized }));
      }
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
