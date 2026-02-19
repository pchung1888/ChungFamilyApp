import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const members = await prisma.familyMember.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: members, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { name: string; role: string; email?: string };
    const { name, role, email } = body;

    if (!name || !role) {
      return NextResponse.json(
        { data: null, error: "Name and role are required" },
        { status: 400 }
      );
    }

    if (role !== "parent" && role !== "teen") {
      return NextResponse.json(
        { data: null, error: "Role must be 'parent' or 'teen'" },
        { status: 400 }
      );
    }

    const member = await prisma.familyMember.create({
      data: { name, role, email: email ?? null },
    });

    return NextResponse.json({ data: member, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create family member" },
      { status: 500 }
    );
  }
}
