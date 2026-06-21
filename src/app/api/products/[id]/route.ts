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
    const product = await db.tileProduct.findUnique({
      where: { id },
      include: {
        catalog: { select: { name: true, catalogId: true, slug: true } },
        gallery: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
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

    // Handle gallery: delete existing and recreate
    await db.galleryImage.deleteMany({ where: { productId: id } });

    const product = await db.tileProduct.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        catalogId: body.catalogId,
        category: body.category,
        series: body.series,
        collection: body.collection || null,
        size: body.size,
        finish: body.finish,
        application: body.application,
        panelLayout: body.panelLayout ?? undefined,
        spaces: body.spaces ?? [],
        hasMatchingFloor: body.hasMatchingFloor || null,
        variants: body.variants ?? [],
        image: body.image || null,
        imageAlt: body.imageAlt || null,
        imageRotation: body.imageRotation ?? 0,
        hasGallery: body.hasGallery ?? false,
        showFirst: body.showFirst ?? "product",
        sortOrder: body.sortOrder ?? 100,
        hidden: body.hidden ?? false,
        gallery: body.gallery?.length
          ? {
              create: body.gallery.map((g: { image: string; label: string; caption?: string; sortOrder: number }) => ({
                image: g.image,
                label: g.label,
                caption: g.caption || null,
                sortOrder: g.sortOrder,
              })),
            }
          : undefined,
      },
      include: { gallery: true },
    });

    return NextResponse.json(product);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
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
    await db.tileProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
