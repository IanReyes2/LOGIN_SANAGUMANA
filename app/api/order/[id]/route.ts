import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/websocket";


//BASTA YUNG CORS TO
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "http://localhost:3001")
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
  res.headers.set("Access-Control-Allow-Headers", "Content-Type")
  return res
}

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

// Normalize order
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

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }))
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  return new Response(`OK ${params.id}`);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const orderId = params.id;

    let updatedOrder;

    // Delete a single item if itemId is provided
    if (body.itemId) {
      await prisma.orderItem.delete({ where: { id: body.itemId } });
      updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (updatedOrder)
        broadcast({
          type: "status_update",
          order: normalizeOrder(updatedOrder),
        });
      return withCORS(NextResponse.json(normalizeOrder(updatedOrder)));
    }

    if (!body.status)
      return NextResponse.json({ error: "Missing status" }, { status: 400 });

    let processingTime: string | undefined = undefined;

    // Calculate processing time if order is being served
    if (body.status === "confirmed") {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order) {
        const diffMs = new Date().getTime() - order.createdAt.getTime();
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        processingTime = `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
      }
    }

    updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: body.status, processingTime },
      include: { items: true },
    });

    broadcast({ type: "status_update", order: normalizeOrder(updatedOrder) });
    return NextResponse.json(normalizeOrder(updatedOrder));
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const orderId = params.id;

    // 1️⃣ FETCH FIRST (for CSV + processing time)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    let processingTime: string | undefined = undefined;
    if (order) {
      const diffMs = new Date().getTime() - order.createdAt.getTime();
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      processingTime = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }

    // ⬅️ THIS is where your CSV logic should read from
    // logDeniedOrderToCSV({ ...order, processingTime })

    // 2️⃣ HARD DELETE
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { id: orderId } }),
    ]);

    // 3️⃣ Broadcast removal
    broadcast({ type: "order_removed", orderId });

    return withCORS(NextResponse.json({ success: true }));
  } catch (err) {
    console.error("DELETE /api/order/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    );
  }
}

