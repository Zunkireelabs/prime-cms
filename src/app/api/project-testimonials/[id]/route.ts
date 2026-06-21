import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  const { id } = await params;

  try {
    const item = await db.projectTestimonial.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch project testimonial" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  const { id } = await params;

  try {
    const body = await req.json();
    const item = await db.projectTestimonial.update({
      where: { id },
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
    return NextResponse.json(item);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update project testimonial" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  const { id } = await params;

  try {
    await db.projectTestimonial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete project testimonial" }, { status: 500 });
  }
}
