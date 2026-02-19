import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        expenses: {
          orderBy: { date: "desc" },
          include: {
            familyMember: { select: { id: true, name: true } },
            creditCard: { select: { id: true, name: true, lastFour: true, pointsName: true } },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { data: null, error: "Trip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: trip, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

interface UpdateTripBody {
  name?: string;
  destination?: string;
  startDate?: string;
  endDate?: string | null;
  budget?: number | null;
  type?: string;
  notes?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json() as UpdateTripBody;

    if (body.type !== undefined) {
      const validTypes = ["road_trip", "flight", "local"];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { data: null, error: "type must be 'road_trip', 'flight', or 'local'" },
          { status: 400 }
        );
      }
    }

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.destination !== undefined && { destination: body.destination }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.budget !== undefined && { budget: body.budget }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ data: trip, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    await prisma.trip.delete({ where: { id } });

    return NextResponse.json({ data: { id }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}
