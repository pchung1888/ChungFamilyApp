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
    const benefits = await prisma.cardBenefit.findMany({
      where: { cardId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: benefits, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch card benefits" },
      { status: 500 }
    );
  }
}

interface CreateBenefitBody {
  name: string;
  value: number;
  frequency: string;
  usedAmount?: number;
  resetDate?: string | null;
}

export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json() as CreateBenefitBody;
    const { name, value, frequency, usedAmount, resetDate } = body;

    if (!name || value === undefined || !frequency) {
      return NextResponse.json(
        { data: null, error: "name, value, and frequency are required" },
        { status: 400 }
      );
    }

    const validFrequencies = ["annual", "monthly", "per_trip"];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { data: null, error: "frequency must be 'annual', 'monthly', or 'per_trip'" },
        { status: 400 }
      );
    }

    const benefit = await prisma.cardBenefit.create({
      data: {
        cardId: id,
        name,
        value,
        frequency,
        usedAmount: usedAmount ?? 0,
        resetDate: resetDate ? new Date(resetDate) : null,
      },
    });

    return NextResponse.json({ data: benefit, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create card benefit" },
      { status: 500 }
    );
  }
}
