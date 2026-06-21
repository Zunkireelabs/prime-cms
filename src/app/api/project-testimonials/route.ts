import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const items = await db.projectTestimonial.findMany({
      orderBy: [{ sortOrder: "asc" }, { project: "asc" }],
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch project testimonials" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const item = await db.projectTestimonial.create({
      data: {
        project: body.project,
        location: body.location ?? null,
        type: body.type ?? null,
        tile: body.tile ?? null,
        size: body.size ?? null,
        area: body.area ?? null,
        sortOrder: body.sortOrder ?? 100,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create project testimonial" }, { status: 500 });
  }
}
