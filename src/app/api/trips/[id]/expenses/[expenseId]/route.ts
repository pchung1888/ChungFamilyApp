import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string; expenseId: string }>;
}

interface UpdateExpenseBody {
  familyMemberId?: string | null;
  creditCardId?: string | null;
  category?: string;
  description?: string;
  amount?: number;
  date?: string;
  pointsEarned?: number;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { expenseId } = await params;
    const body = await request.json() as UpdateExpenseBody;

    if (body.category !== undefined) {
      const validCategories = EXPENSE_CATEGORIES.map((c) => c.value);
      if (!validCategories.includes(body.category as (typeof validCategories)[number])) {
        return NextResponse.json(
          { data: null, error: `category must be one of: ${validCategories.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(body.familyMemberId !== undefined && { familyMemberId: body.familyMemberId }),
        ...(body.creditCardId !== undefined && { creditCardId: body.creditCardId }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.pointsEarned !== undefined && { pointsEarned: body.pointsEarned }),
      },
      include: {
        familyMember: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true, lastFour: true, pointsName: true } },
      },
    });

    return NextResponse.json({ data: expense, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { expenseId } = await params;

    await prisma.expense.delete({ where: { id: expenseId } });

    return NextResponse.json({ data: { id: expenseId }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
