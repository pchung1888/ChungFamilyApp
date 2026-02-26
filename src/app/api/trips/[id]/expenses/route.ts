import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const expenses = await prisma.expense.findMany({
      where: { tripId: id },
      orderBy: { date: "desc" },
      include: {
        familyMember: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true, lastFour: true, pointsName: true } },
      },
    });
    return NextResponse.json({ data: expenses, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

interface SplitInput {
  participantId: string;
  amount: number;
}

interface CreateExpenseBody {
  familyMemberId?: string | null;
  creditCardId?: string | null;
  paidByParticipantId?: string | null;
  category: string;
  description: string;
  amount: number;
  date: string;
  pointsEarned?: number;
  receiptPath?: string | null;
  splits?: SplitInput[];
}

export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json() as CreateExpenseBody;
    const {
      familyMemberId,
      creditCardId,
      paidByParticipantId,
      category,
      description,
      amount,
      date,
      pointsEarned,
      receiptPath,
      splits,
    } = body;

    if (!category || !description || amount === undefined || !date) {
      return NextResponse.json(
        { data: null, error: "category, description, amount, and date are required" },
        { status: 400 }
      );
    }

    const validCategories = EXPENSE_CATEGORIES.map((c) => c.value);
    if (!validCategories.includes(category as (typeof validCategories)[number])) {
      return NextResponse.json(
        { data: null, error: `category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        tripId: id,
        familyMemberId: familyMemberId ?? null,
        creditCardId: creditCardId ?? null,
        paidByParticipantId: paidByParticipantId ?? null,
        category,
        description,
        amount,
        date: new Date(date),
        pointsEarned: pointsEarned ?? 0,
        receiptPath: receiptPath ?? null,
        ...(splits && splits.length > 0 && {
          splits: {
            create: splits.map((s) => ({
              participantId: s.participantId,
              amount: s.amount,
            })),
          },
        }),
      },
      include: {
        familyMember: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true, lastFour: true, pointsName: true } },
        paidByParticipant: { select: { id: true, name: true } },
        splits: {
          select: {
            id: true,
            participantId: true,
            amount: true,
            participant: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: expense, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
