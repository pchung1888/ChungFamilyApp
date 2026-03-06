import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; groupId: string }>;
}

interface PatchGroupBody {
  date?: string;
  paidByParticipantId?: string | null;
  familyMemberId?: string | null;
  creditCardId?: string | null;
}

async function unlinkReceipt(filename: string): Promise<void> {
  try {
    await unlink(join(process.cwd(), "public", "uploads", "receipts", filename));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/**
 * PATCH /api/trips/[id]/expenses/receipt-group/[groupId]
 *
 * Updates date, paidBy, familyMember, creditCard on ALL expenses in the group.
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: tripId, groupId } = await params;

    let body: PatchGroupBody;
    try {
      body = (await request.json()) as PatchGroupBody;
    } catch {
      return NextResponse.json({ data: null, error: "Invalid request body" }, { status: 400 });
    }

    // Verify the group exists and belongs to this trip
    const existing = await prisma.expense.findFirst({
      where: { receiptGroupId: groupId, tripId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ data: null, error: "Receipt group not found" }, { status: 404 });
    }

    const result = await prisma.expense.updateMany({
      where: { receiptGroupId: groupId, tripId },
      data: {
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.paidByParticipantId !== undefined && {
          paidByParticipantId: body.paidByParticipantId,
        }),
        ...(body.familyMemberId !== undefined && { familyMemberId: body.familyMemberId }),
        ...(body.creditCardId !== undefined && { creditCardId: body.creditCardId }),
      },
    });

    return NextResponse.json({ data: { updatedCount: result.count }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to update receipt group" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[id]/expenses/receipt-group/[groupId]
 *
 * Deletes ALL expenses in the group and the associated receipt file.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: tripId, groupId } = await params;

    // Find one expense to get the receipt path (all share the same file)
    const sample = await prisma.expense.findFirst({
      where: { receiptGroupId: groupId, tripId },
      select: { receiptPath: true },
    });
    if (!sample) {
      return NextResponse.json({ data: null, error: "Receipt group not found" }, { status: 404 });
    }

    const result = await prisma.expense.deleteMany({
      where: { receiptGroupId: groupId, tripId },
    });

    // Delete the receipt file after DB rows are removed
    if (sample.receiptPath) {
      await unlinkReceipt(sample.receiptPath);
    }

    return NextResponse.json({ data: { deletedCount: result.count }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to delete receipt group" },
      { status: 500 }
    );
  }
}
