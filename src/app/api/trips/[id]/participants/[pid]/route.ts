import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; pid: string }>;
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id, pid } = await params;

    const participant = await prisma.tripParticipant.findUnique({
      where: { id: pid },
      select: { id: true, tripId: true },
    });

    if (!participant) {
      return NextResponse.json(
        { data: null, error: "Participant not found" },
        { status: 404 }
      );
    }

    if (participant.tripId !== id) {
      return NextResponse.json(
        { data: null, error: "Participant does not belong to this trip" },
        { status: 404 }
      );
    }

    await prisma.tripParticipant.delete({ where: { id: pid } });

    return NextResponse.json({ data: { id: pid }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to delete participant" },
      { status: 500 }
    );
  }
}
