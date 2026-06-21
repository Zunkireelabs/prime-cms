import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const mockups = await db.roomMockup.findMany({
      where: { hidden: false },
      include: {
        featuredProducts: {
          select: { id: true, name: true, slug: true, image: true, size: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(mockups);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch mockups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const mockup = await db.roomMockup.create({ data: body });
    return NextResponse.json(mockup, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create mockup" }, { status: 500 });
  }
}
