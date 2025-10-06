import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/websocket";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const orderId = params.id;

    let updatedOrder;

    // Delete a single item if itemId is provided
    if (body.itemId) {
      await prisma.orderItem.delete({ where: { id: body.itemId } });
      updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }, // only OrderItem
      });
      if (updatedOrder) broadcast({ type: "status_update", order: updatedOrder });
      return NextResponse.json(updatedOrder);
    }

    // Update order status
    if (!body.status)
      return NextResponse.json({ error: "Missing status" }, { status: 400 });

    updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: body.status },
      include: { items: true }, // only OrderItem
    });

    broadcast({ type: "status_update", order: updatedOrder });
    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;

    // Instead of hard delete, mark order as served
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "served" },
      include: { items: true },
    });

    broadcast({ type: "order_removed", orderId });

    return NextResponse.json({ success: true, orderId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
