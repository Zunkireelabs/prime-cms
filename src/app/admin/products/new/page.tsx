import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const catalogs = await db.tileCatalog.findMany({
    select: { id: true, name: true, catalogId: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="New Product" description="Add a new tile product to the catalog" />
      <ProductForm catalogs={catalogs} mode="new" />
    </div>
  );
}
