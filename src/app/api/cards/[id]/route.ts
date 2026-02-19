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
    const card = await prisma.creditCard.findUnique({
      where: { id },
      include: { benefits: { orderBy: { createdAt: "asc" } } },
    });

    if (!card) {
      return NextResponse.json(
        { data: null, error: "Credit card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: card, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch credit card" },
      { status: 500 }
    );
  }
}

interface UpdateCardBody {
  name?: string;
  network?: string;
  lastFour?: string;
  annualFee?: number;
  annualFeeDate?: string | null;
  pointsBalance?: number;
  pointsExpiresAt?: string | null;
  pointsName?: string;
  pointsCppValue?: number;
  isActive?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json() as UpdateCardBody;

    if (body.lastFour !== undefined && (body.lastFour.length !== 4 || !/^\d{4}$/.test(body.lastFour))) {
      return NextResponse.json(
        { data: null, error: "lastFour must be exactly 4 digits" },
        { status: 400 }
      );
    }

    const card = await prisma.creditCard.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.network !== undefined && { network: body.network }),
        ...(body.lastFour !== undefined && { lastFour: body.lastFour }),
        ...(body.annualFee !== undefined && { annualFee: body.annualFee }),
        ...(body.annualFeeDate !== undefined && {
          annualFeeDate: body.annualFeeDate ? new Date(body.annualFeeDate) : null,
        }),
        ...(body.pointsBalance !== undefined && { pointsBalance: body.pointsBalance }),
        ...(body.pointsExpiresAt !== undefined && {
          pointsExpiresAt: body.pointsExpiresAt ? new Date(body.pointsExpiresAt) : null,
        }),
        ...(body.pointsName !== undefined && { pointsName: body.pointsName }),
        ...(body.pointsCppValue !== undefined && { pointsCppValue: body.pointsCppValue }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { benefits: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ data: card, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to update credit card" },
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

    await prisma.creditCard.delete({ where: { id } });

    return NextResponse.json({ data: { id }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to delete credit card" },
      { status: 500 }
    );
  }
}
