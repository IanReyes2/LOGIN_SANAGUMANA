import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to map Prisma response to frontend DTO
function mapMenuItem(item: any) {
  return {
    id: item.id,
    name: item.name,
    available: item.available,
    availableDays: item.menuitemavailability.map((a: any) => a.dayOfWeek),
  };
}

// GET /api/menu
export async function GET() {
  try {
    const items = await prisma.menuitem.findMany({
      include: { menuitemavailability: true },
    });

    return NextResponse.json(items.map(mapMenuItem));
  } catch (err) {
    console.error("GET /api/menu error:", err);
    return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 });
  }
}

// PATCH /api/menu/:id
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = parseInt(url.pathname.split("/").pop() || "", 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid menu item id" }, { status: 400 });

    const body = await req.json();
    const { available, days } = body as { available?: boolean; days?: string[] };

    // Update availability
    if (typeof available === "boolean") {
      await prisma.menuitem.update({ where: { id }, data: { available } });
    }

    // Update day availability
    if (Array.isArray(days)) {
      await prisma.menuitemavailability.deleteMany({ where: { menuItemId: id } });

      const createData = days.map((day) => ({
        dayOfWeek: day,
        menuItemId: id,
      }));

      if (createData.length > 0) {
        await prisma.menuitemavailability.createMany({ data: createData });
      }
    }

    // Return updated item
    const updatedItem = await prisma.menuitem.findUnique({
      where: { id },
      include: { menuitemavailability: true },
    });

    if (!updatedItem) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });

    return NextResponse.json(mapMenuItem(updatedItem));
  } catch (err) {
    console.error("PATCH /api/menu error:", err);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}
