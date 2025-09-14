import { NextResponse } from "next/server";

type Order = {
  id: number;
  code: string;
  date: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
};

const orders: Order[] = []; // Temporary in-memory storage

// POST /api/orders
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.code || !body.items || !body.total) {
      return NextResponse.json(
        { error: "Invalid order data" },
        { status: 400 }
      );
    }

    const order: Order = {
      id: Date.now(),
      code: body.code,
      date: new Date().toISOString(),
      items: body.items,
      total: body.total,
    };

    orders.push(order);

    return NextResponse.json(
      { message: "Order placed", order },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Failed to place order" },
      { status: 500 }
    );
  }
}

// GET /api/orders
export async function GET() {
  try {
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
