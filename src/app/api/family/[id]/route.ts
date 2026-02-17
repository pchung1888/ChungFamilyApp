import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json() as { name?: string; role?: string; email?: string };
    const { name, role, email } = body;

    if (role && role !== "parent" && role !== "teen") {
      return NextResponse.json(
        { data: null, error: "Role must be 'parent' or 'teen'" },
        { status: 400 }
      );
    }

    const member = await prisma.familyMember.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(email !== undefined && { email }),
      },
    });

    return NextResponse.json({ data: member, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to update family member" },
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

    await prisma.familyMember.delete({ where: { id } });

    return NextResponse.json({ data: { id }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to delete family member" },
      { status: 500 }
    );
  }
}
