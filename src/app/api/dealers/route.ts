import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const dealers = await db.dealer.findMany({
      orderBy: [{ province: "asc" }, { city: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(dealers);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch dealers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const dealer = await db.dealer.create({ data: body });
    return NextResponse.json(dealer, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create dealer" }, { status: 500 });
  }
}
