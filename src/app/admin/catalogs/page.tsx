import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, Badge, EmptyState } from "@/components/admin/Table";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  type CatalogWithCount = Awaited<ReturnType<typeof db.tileCatalog.findMany<{
    include: { _count: { select: { products: true } } };
  }>>>;
  let catalogs: CatalogWithCount = [];
  let dbError: string | null = null;

  try {
    catalogs = await db.tileCatalog.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
    });
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div>
      <PageHeader
        title="Catalogs"
        description={dbError ? "Error loading" : `${catalogs.length} catalog${catalogs.length !== 1 ? "s" : ""}`}
      />

      {dbError && (
        <div style={{ padding: "16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", marginBottom: "24px", color: "#ef4444", fontSize: "13px", fontFamily: "monospace" }}>
          DB Error: {dbError}
        </div>
      )}

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Catalog ID</Th>
            <Th>Size</Th>
            <Th>Products</Th>
            <Th>Featured</Th>
            <Th style={{ textAlign: "right" }}>Sort</Th>
          </tr>
        </Thead>
        <Tbody>
          {catalogs.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState message="No catalogs yet." />
              </td>
            </tr>
          ) : (
            catalogs.map((cat) => (
              <Tr key={cat.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{cat.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    {cat.slug}
                  </div>
                </Td>
                <Td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {cat.catalogId}
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{cat.size ?? "—"}</Td>
                <Td>
                  <Badge variant="default">{cat._count.products}</Badge>
                </Td>
                <Td>
                  {cat.featured ? (
                    <Badge variant="success">Yes</Badge>
                  ) : (
                    <span style={{ color: "var(--color-text-faint)", fontSize: "12px" }}>No</span>
                  )}
                </Td>
                <Td style={{ textAlign: "right", color: "var(--color-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                  {cat.sortOrder}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
