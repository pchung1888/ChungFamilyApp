import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const cards = await prisma.creditCard.findMany({
      orderBy: { createdAt: "asc" },
      include: { benefits: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ data: cards, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch credit cards" },
      { status: 500 }
    );
  }
}

interface CreateCardBody {
  name: string;
  network: string;
  lastFour: string;
  annualFee: number;
  annualFeeDate?: string | null;
  pointsBalance?: number;
  pointsExpiresAt?: string | null;
  pointsName: string;
  pointsCppValue: number;
  isActive?: boolean;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as CreateCardBody;
    const {
      name,
      network,
      lastFour,
      annualFee,
      annualFeeDate,
      pointsBalance,
      pointsExpiresAt,
      pointsName,
      pointsCppValue,
      isActive,
    } = body;

    if (!name || !network || !lastFour || annualFee === undefined || !pointsName || pointsCppValue === undefined) {
      return NextResponse.json(
        { data: null, error: "name, network, lastFour, annualFee, pointsName, and pointsCppValue are required" },
        { status: 400 }
      );
    }

    if (lastFour.length !== 4 || !/^\d{4}$/.test(lastFour)) {
      return NextResponse.json(
        { data: null, error: "lastFour must be exactly 4 digits" },
        { status: 400 }
      );
    }

    const card = await prisma.creditCard.create({
      data: {
        name,
        network,
        lastFour,
        annualFee,
        annualFeeDate: annualFeeDate ? new Date(annualFeeDate) : null,
        pointsBalance: pointsBalance ?? 0,
        pointsExpiresAt: pointsExpiresAt ? new Date(pointsExpiresAt) : null,
        pointsName,
        pointsCppValue,
        isActive: isActive ?? true,
      },
      include: { benefits: true },
    });

    return NextResponse.json({ data: card, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create credit card" },
      { status: 500 }
    );
  }
}
