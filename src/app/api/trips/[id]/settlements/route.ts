import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CreateSettlementBody {
  fromId: string;
  toId: string;
  amount: number;
  note?: string | null;
}

export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as CreateSettlementBody;
    const { fromId, toId, amount, note } = body;

    if (!fromId || !toId || amount === undefined) {
      return NextResponse.json(
        { data: null, error: "fromId, toId, and amount are required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { data: null, error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (fromId === toId) {
      return NextResponse.json(
        { data: null, error: "fromId and toId must be different participants" },
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

    // Verify both participants belong to this trip
    const [fromParticipant, toParticipant] = await Promise.all([
      prisma.tripParticipant.findUnique({
        where: { id: fromId },
        select: { id: true, tripId: true },
      }),
      prisma.tripParticipant.findUnique({
        where: { id: toId },
        select: { id: true, tripId: true },
      }),
    ]);

    if (!fromParticipant || fromParticipant.tripId !== id) {
      return NextResponse.json(
        { data: null, error: "fromId participant not found on this trip" },
        { status: 404 }
      );
    }

    if (!toParticipant || toParticipant.tripId !== id) {
      return NextResponse.json(
        { data: null, error: "toId participant not found on this trip" },
        { status: 404 }
      );
    }

    const settlement = await prisma.settlement.create({
      data: {
        tripId: id,
        fromId,
        toId,
        amount,
        note: note ?? null,
        settledAt: new Date(),
      },
      include: {
        from: { select: { id: true, name: true } },
        to: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: settlement, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create settlement" },
      { status: 500 }
    );
  }
}
