import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; benefitId: string }>;
}

interface UpdateBenefitBody {
  name?: string;
  value?: number;
  frequency?: string;
  usedAmount?: number;
  resetDate?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { benefitId } = await params;
    const body = await request.json() as UpdateBenefitBody;

    if (body.frequency !== undefined) {
      const validFrequencies = ["annual", "monthly", "per_trip"];
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          { data: null, error: "frequency must be 'annual', 'monthly', or 'per_trip'" },
          { status: 400 }
        );
      }
    }

    const benefit = await prisma.cardBenefit.update({
      where: { id: benefitId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.frequency !== undefined && { frequency: body.frequency }),
        ...(body.usedAmount !== undefined && { usedAmount: body.usedAmount }),
        ...(body.resetDate !== undefined && {
          resetDate: body.resetDate ? new Date(body.resetDate) : null,
        }),
      },
    });

    return NextResponse.json({ data: benefit, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to update card benefit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { benefitId } = await params;

    await prisma.cardBenefit.delete({ where: { id: benefitId } });

    return NextResponse.json({ data: { id: benefitId }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to delete card benefit" },
      { status: 500 }
    );
  }
}
