import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITINERARY_TYPES } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ data: null, error: "Trip not found" }, { status: 404 });
    }

    const items = await prisma.itineraryItem.findMany({
      where: { tripId: id },
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data: items, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to fetch itinerary" }, { status: 500 });
  }
}

interface CreateItineraryBody {
  date: string;
  title: string;
  type: string;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  sortOrder?: number;
}

export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as CreateItineraryBody;
    const { date, title, type, location, startTime, endTime, notes, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ data: null, error: "title is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ data: null, error: "date is required" }, { status: 400 });
    }

    const validTypes = ITINERARY_TYPES.map((t) => t.value);
    if (!type || !validTypes.includes(type as (typeof validTypes)[number])) {
      return NextResponse.json(
        { data: null, error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ data: null, error: "Trip not found" }, { status: 404 });
    }

    const item = await prisma.itineraryItem.create({
      data: {
        tripId: id,
        date: new Date(date),
        title: title.trim(),
        type,
        location: location ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        notes: notes ?? null,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({ data: item, error: null }, { status: 201 });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to create itinerary item" }, { status: 500 });
  }
}
