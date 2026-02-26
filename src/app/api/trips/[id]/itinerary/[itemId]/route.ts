import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITINERARY_TYPES } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

async function findItem(id: string, itemId: string) {
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } });
  if (!item || item.tripId !== id) return null;
  return item;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id, itemId } = await params;
    const item = await findItem(id, itemId);
    if (!item) {
      return NextResponse.json({ data: null, error: "Itinerary item not found" }, { status: 404 });
    }

    const body = await request.json() as {
      date?: string;
      title?: string;
      type?: string;
      location?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      notes?: string | null;
      sortOrder?: number;
    };

    if (body.type !== undefined) {
      const validTypes = ITINERARY_TYPES.map((t) => t.value);
      if (!validTypes.includes(body.type as (typeof validTypes)[number])) {
        return NextResponse.json(
          { data: null, error: `type must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.endTime !== undefined && { endTime: body.endTime }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json({ data: updated, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to update itinerary item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id, itemId } = await params;
    const item = await findItem(id, itemId);
    if (!item) {
      return NextResponse.json({ data: null, error: "Itinerary item not found" }, { status: 404 });
    }

    await prisma.itineraryItem.delete({ where: { id: itemId } });
    return NextResponse.json({ data: { id: itemId }, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to delete itinerary item" }, { status: 500 });
  }
}
