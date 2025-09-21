import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newOrder = await prisma.order.create({
      data: {
        customerName: body.customer || "Guest",
        items: body.items,
        status: "pending",
        total: body.total ?? 0,
      } as Prisma.OrderCreateInput, // ✅ tell TS this is valid
    });

    return NextResponse.json({ success: true, data: newOrder });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}
