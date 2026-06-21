import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const products = await db.tileProduct.findMany({
      where: { hidden: false },
      include: {
        catalog: { select: { name: true, catalogId: true, slug: true } },
        gallery: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(products);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const product = await db.tileProduct.create({
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
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
