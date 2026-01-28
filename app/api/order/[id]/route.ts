// app/api/order/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/websocket";

const FRONTEND_ORIGIN = "http://192.168.254.113:3006"; // your frontend

// --------------------
// CORS helper
// --------------------
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

// --------------------
// OPTIONS preflight
// --------------------
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// --------------------
// DELETE order
// --------------------
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return withCORS(
        NextResponse.json({ error: "Order not found" }, { status: 404 })
      );
    }

    // Delete order + items
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { id: orderId } }),
    ]);

    // Broadcast removal
    broadcast({ type: "order_removed", orderId });

    return withCORS(NextResponse.json({ success: true }));
  } catch (err) {
    console.error("DELETE /api/order/[id] failed:", err);
    return withCORS(
      NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
    );
  }
}

// --------------------
// PATCH example (optional)
// --------------------
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await req.json();

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: body.status },
      include: { items: true },
    });

    broadcast({ type: "status_update", order: updatedOrder });
    return withCORS(NextResponse.json(updatedOrder));
  } catch (err) {
    console.error(err);
    return withCORS(
      NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    );
  }
}

// --------------------
// GET example (optional)
// --------------------
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  return withCORS(NextResponse.json(order));
}
