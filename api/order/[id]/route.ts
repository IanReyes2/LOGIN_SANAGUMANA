// app/api/order/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  items?: OrderItemType[];
}

function normalizeOrder(o: OrderType) {
  return {
    id: o.id,
    orderCode: o.orderCode || `IU${String(o.id).padStart(3, "0")}`,
    createdAt: o.createdAt?.toISOString() || new Date().toISOString(),
    status: o.status,
    total: o.total,
    items: (o.items || []).map((i) => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
  };
}

/**
 * PATCH endpoint to update order status or mark an item as served
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    // If an itemId is sent, remove that item (mark as served)
    if (body.itemId) {
      await prisma.orderItem.delete({
        where: { id: body.itemId },
      });

      // Fetch the updated order with remaining items
      const updatedOrder = await prisma.order.findUnique({
        where: { id: params.id },
        include: { items: true },
      });

      return NextResponse.json(normalizeOrder(updatedOrder!));
    }

    // Otherwise, just update order status
    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: body.status ?? "confirmed" },
      include: { items: true },
    });

    return NextResponse.json(normalizeOrder(updated));
  } catch (err) {
    console.error("PATCH /api/order/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update" },
      { status: 500 }
    );
  }
}
