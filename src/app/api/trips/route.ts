import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { expenses: true } },
        expenses: { select: { amount: true } },
      },
    });
    return NextResponse.json({ data: trips, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

interface CreateTripBody {
  name: string;
  destination: string;
  startDate: string;
  endDate?: string | null;
  budget?: number | null;
  type: string;
  notes?: string | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as CreateTripBody;
    const { name, destination, startDate, endDate, budget, type, notes } = body;

    if (!name || !destination || !startDate || !type) {
      return NextResponse.json(
        { data: null, error: "name, destination, startDate, and type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["road_trip", "flight", "local"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { data: null, error: "type must be 'road_trip', 'flight', or 'local'" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        name,
        destination,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ?? null,
        type,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({ data: trip, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
