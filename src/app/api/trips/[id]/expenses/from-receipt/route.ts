import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface LineItemInput {
  description: string;
  amount: number;
  category: string;
}

interface SplitInput {
  participantId: string;
  amount: number;
}

interface FromReceiptBody {
  items: LineItemInput[];
  receiptPath?: string | null;
  receiptGroupName?: string | null;
  date: string;
  paidByParticipantId?: string | null;
  familyMemberId?: string | null;
  creditCardId?: string | null;
  /** Splits keyed to the TOTAL receipt amount — distributed proportionally per item */
  splits?: SplitInput[];
}

const VALID_CATEGORIES = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.value));

/**
 * Distribute receipt-level splits proportionally across line items.
 *
 * Each item gets splits proportional to its fraction of the total amount.
 * Rounding errors accumulate on the last item.
 */
function distributeSplits(
  items: LineItemInput[],
  totalSplits: SplitInput[],
  total: number
): SplitInput[][] {
  return items.map((item, idx) => {
    const isLast = idx === items.length - 1;
    const ratio = total > 0 ? item.amount / total : 1 / items.length;

    // For the last item, compute from what's left to avoid rounding drift
    if (isLast) {
      const alreadyDistributed = items.slice(0, -1).reduce(
        (acc, prev) => {
          const r = total > 0 ? prev.amount / total : 1 / items.length;
          return acc.map((s, i) => ({
            ...s,
            amount: s.amount + Math.round((totalSplits[i]?.amount ?? 0) * r * 100) / 100,
          }));
        },
        totalSplits.map((s) => ({ ...s, amount: 0 }))
      );

      return totalSplits.map((s, i) => ({
        participantId: s.participantId,
        amount: Math.round((s.amount - (alreadyDistributed[i]?.amount ?? 0)) * 100) / 100,
      }));
    }

    return totalSplits.map((s) => ({
      participantId: s.participantId,
      amount: Math.round(s.amount * ratio * 100) / 100,
    }));
  });
}

/**
 * POST /api/trips/[id]/expenses/from-receipt
 *
 * Creates N Expense rows atomically, all sharing a generated receiptGroupId.
 * Splits (if provided) are distributed proportionally across items by amount.
 */
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: tripId } = await params;

    let body: FromReceiptBody;
    try {
      body = (await request.json()) as FromReceiptBody;
    } catch {
      return NextResponse.json({ data: null, error: "Invalid request body" }, { status: 400 });
    }

    const { items, receiptPath, receiptGroupName, date, paidByParticipantId, familyMemberId, creditCardId, splits } =
      body;

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { data: null, error: "items must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json({ data: null, error: "date is required" }, { status: 400 });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      if (!item.description?.trim()) {
        return NextResponse.json(
          { data: null, error: `items[${i}].description is required` },
          { status: 400 }
        );
      }
      if (typeof item.amount !== "number" || item.amount <= 0) {
        return NextResponse.json(
          { data: null, error: `items[${i}].amount must be a positive number` },
          { status: 400 }
        );
      }
      if (!VALID_CATEGORIES.has(item.category)) {
        return NextResponse.json(
          {
            data: null,
            error: `items[${i}].category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Verify trip exists
    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
    if (!trip) {
      return NextResponse.json({ data: null, error: "Trip not found" }, { status: 404 });
    }

    const receiptGroupId = randomUUID();
    const parsedDate = new Date(date);
    const total = items.reduce((s, item) => s + item.amount, 0);

    // Distribute splits proportionally if provided
    const perItemSplits =
      splits && splits.length > 0 ? distributeSplits(items, splits, total) : null;

    const expenses = await prisma.$transaction(
      items.map((item, idx) =>
        prisma.expense.create({
          data: {
            tripId,
            category: item.category,
            description: item.description.trim(),
            amount: item.amount,
            date: parsedDate,
            receiptPath: receiptPath ?? null,
            receiptGroupId,
            receiptGroupName: receiptGroupName ?? null,
            lineItemIndex: idx,
            pointsEarned: 0,
            paidByParticipantId: paidByParticipantId ?? null,
            familyMemberId: familyMemberId ?? null,
            creditCardId: creditCardId ?? null,
            ...(perItemSplits &&
              perItemSplits[idx] &&
              perItemSplits[idx].length > 0 && {
                splits: {
                  create: perItemSplits[idx]
                    .filter((s) => s.amount > 0)
                    .map((s) => ({
                      participantId: s.participantId,
                      amount: s.amount,
                    })),
                },
              }),
          },
          include: {
            familyMember: { select: { id: true, name: true } },
            creditCard: { select: { id: true, name: true, lastFour: true } },
            paidByParticipant: { select: { id: true, name: true } },
          },
        })
      )
    );

    return NextResponse.json({ data: { receiptGroupId, expenses }, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create expenses" },
      { status: 500 }
    );
  }
}
