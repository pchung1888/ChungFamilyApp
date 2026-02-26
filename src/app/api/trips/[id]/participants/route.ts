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

    const trip = await prisma.trip.findUnique({ where: { id }, select: { id: true } });
    if (!trip) {
      return NextResponse.json(
        { data: null, error: "Trip not found" },
        { status: 404 }
      );
    }

    const participants = await prisma.tripParticipant.findMany({
      where: { tripId: id },
      orderBy: { createdAt: "asc" },
      include: {
        familyMember: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: participants, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}

interface CreateParticipantBody {
  name: string;
  email?: string | null;
  familyMemberId?: string | null;
  groupName?: string | null;
}

export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as CreateParticipantBody;
    const { name, email, familyMemberId, groupName } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { data: null, error: "name is required" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({ where: { id }, select: { id: true } });
    if (!trip) {
      return NextResponse.json(
        { data: null, error: "Trip not found" },
        { status: 404 }
      );
    }

    // Check unique constraint [tripId, name]
    const existing = await prisma.tripParticipant.findUnique({
      where: { tripId_name: { tripId: id, name: name.trim() } },
    });
    if (existing) {
      return NextResponse.json(
        { data: null, error: `Participant "${name.trim()}" already exists on this trip` },
        { status: 400 }
      );
    }

    const participant = await prisma.tripParticipant.create({
      data: {
        tripId: id,
        name: name.trim(),
        email: email ?? null,
        familyMemberId: familyMemberId ?? null,
        groupName: groupName ?? null,
      },
      include: {
        familyMember: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: participant, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create participant" },
      { status: 500 }
    );
  }
}
