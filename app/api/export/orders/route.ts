import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Utility to escape commas properly
function escapeCSV(val: any) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  return str.includes(",") ? `"${str}"` : str;
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // CSV header with correct column names
    let csv =
      "Order Code,Customer Name,Total,Status,Created At,Updated At,Processing Time,Items\n";

    for (const order of orders) {
      const itemNames = order.items.map((i) => i.name).join(" | ");

      const formattedCreatedAt = order.createdAt
        ? new Date(order.createdAt).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const formattedUpdatedAt = order.updatedAt
        ? new Date(order.updatedAt).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      csv += [
        escapeCSV(order.orderCode ?? `#${order.id.slice(0, 6)}`),
        escapeCSV(order.customerName),
        escapeCSV(order.total),
        escapeCSV(order.status),
        escapeCSV(formattedCreatedAt),
        escapeCSV(formattedUpdatedAt),
        escapeCSV(order.processingTime ?? ""),
        escapeCSV(itemNames),
      ].join(",") + "\n";
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="orders_export_${Date.now()}.csv"`,
        "Access-Control-Allow-Origin": "*", // allow cross-port fetch
      },
    });
  } catch (error) {
    console.error("CSV Export Error:", error);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    );
  }
}
