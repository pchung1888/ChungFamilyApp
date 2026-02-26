import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface BalanceEntry {
  participantId: string;
  name: string;
  net: number;
}

interface TransactionEntry {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
}

interface BalanceResponse {
  balances: BalanceEntry[];
  transactions: TransactionEntry[];
}

/**
 * Greedy min-transactions algorithm.
 * Sorts creditors (net > 0) and debtors (net < 0), matches largest pairs.
 */
function computeTransactions(balances: BalanceEntry[]): TransactionEntry[] {
  const transactions: TransactionEntry[] = [];

  // Work on mutable copies rounded to avoid floating-point drift
  const creditors: Array<{ id: string; name: string; amount: number }> = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ id: b.participantId, name: b.name, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const debtors: Array<{ id: string; name: string; amount: number }> = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ id: b.participantId, name: b.name, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    if (!creditor || !debtor) break;

    const settle = Math.min(creditor.amount, debtor.amount);
    const rounded = Math.round(settle * 100) / 100;

    if (rounded > 0) {
      transactions.push({
        from: { id: debtor.id, name: debtor.name },
        to: { id: creditor.id, name: creditor.name },
        amount: rounded,
      });
    }

    creditor.amount -= settle;
    debtor.amount -= settle;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount < 0.005) di++;
  }

  return transactions;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json(
        { data: null, error: "Trip not found" },
        { status: 404 }
      );
    }

    const participants = await prisma.tripParticipant.findMany({
      where: { tripId: id },
      select: { id: true, name: true },
    });

    if (participants.length === 0) {
      return NextResponse.json<{ data: BalanceResponse; error: null }>({
        data: { balances: [], transactions: [] },
        error: null,
      });
    }

    const participantIds = participants.map((p) => p.id);

    // All expenses that have a payer participant and splits
    const expenses = await prisma.expense.findMany({
      where: {
        tripId: id,
        paidByParticipantId: { in: participantIds },
      },
      select: {
        id: true,
        amount: true,
        paidByParticipantId: true,
        splits: {
          select: {
            participantId: true,
            amount: true,
          },
        },
      },
    });

    // All settlements for this trip
    const settlements = await prisma.settlement.findMany({
      where: { tripId: id },
      select: { fromId: true, toId: true, amount: true },
    });

    // Build net balance map: participantId -> net amount
    const netMap = new Map<string, number>();
    for (const p of participants) {
      netMap.set(p.id, 0);
    }

    for (const expense of expenses) {
      if (!expense.paidByParticipantId) continue;

      // Payer is credited the full expense amount
      const payerNet = netMap.get(expense.paidByParticipantId) ?? 0;
      netMap.set(expense.paidByParticipantId, payerNet + expense.amount);

      // Each split participant owes their split amount
      for (const split of expense.splits) {
        const splitNet = netMap.get(split.participantId) ?? 0;
        netMap.set(split.participantId, splitNet - split.amount);
      }
    }

    // Settlements: from pays to, so from is owed less (net goes up), to receives (net goes down)
    for (const settlement of settlements) {
      const fromNet = netMap.get(settlement.fromId) ?? 0;
      netMap.set(settlement.fromId, fromNet + settlement.amount);

      const toNet = netMap.get(settlement.toId) ?? 0;
      netMap.set(settlement.toId, toNet - settlement.amount);
    }

    const balances: BalanceEntry[] = participants.map((p) => ({
      participantId: p.id,
      name: p.name,
      net: Math.round((netMap.get(p.id) ?? 0) * 100) / 100,
    }));

    const transactions = computeTransactions(balances);

    return NextResponse.json<{ data: BalanceResponse; error: null }>({
      data: { balances, transactions },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to compute balance" },
      { status: 500 }
    );
  }
}
