import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, catalogs] = await Promise.all([
    db.tileProduct.findUnique({
      where: { id },
      include: { gallery: { orderBy: { sortOrder: "asc" } } },
    }),
    db.tileCatalog.findMany({
      select: { id: true, name: true, catalogId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product) notFound();

  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    catalogId: product.catalogId,
    category: product.category,
    series: product.series,
    collection: product.collection ?? "",
    size: product.size,
    finish: product.finish,
    application: product.application,
    panelLayout: product.panelLayout ? JSON.stringify(product.panelLayout) : "",
    spaces: product.spaces,
    hasMatchingFloor: product.hasMatchingFloor ?? "",
    variants: product.variants.join(", "),
    image: product.image ?? "",
    imageAlt: product.imageAlt ?? "",
    imageRotation: product.imageRotation,
    hasGallery: product.hasGallery,
    gallery: product.gallery.map((g) => ({
      id: g.id,
      image: g.image,
      label: g.label,
      caption: g.caption ?? "",
      sortOrder: g.sortOrder,
    })),
    showFirst: product.showFirst,
    sortOrder: product.sortOrder,
    hidden: product.hidden,
  };

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`Editing product · ${product.size}`}
      />
      <ProductForm catalogs={catalogs} initialData={initialData} mode="edit" />
    </div>
  );
}
