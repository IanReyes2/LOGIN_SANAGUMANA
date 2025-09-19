import { NextResponse } from "next/server";
import { orders } from "../order/route";

// GET /api/ready-orders
export async function GET() {
  try {
    const readyOrders = orders.filter((order) => (order as any).status === "Ready");
    return NextResponse.json(readyOrders, { status: 200 });
  } catch (error) {
    console.error("GET /api/ready-orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ready orders" },
      { status: 500 }
    );
  }
}
