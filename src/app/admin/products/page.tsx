import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, Badge, EmptyState } from "@/components/admin/Table";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await db.tileProduct.findMany({
    include: { catalog: { select: { name: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} tile product${products.length !== 1 ? "s" : ""}`}
        action={{ label: "New Product", href: "/admin/products/new" }}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Catalog</Th>
            <Th>Size</Th>
            <Th>Category</Th>
            <Th>Series</Th>
            <Th>Finish</Th>
            <Th>Status</Th>
            <Th style={{ textAlign: "right" }}>Sort</Th>
          </tr>
        </Thead>
        <Tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <EmptyState message="No products yet. Click 'New Product' to add one." />
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <Tr key={product.id} href={`/admin/products/${product.id}`}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{product.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    {product.slug}
                  </div>
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>
                  {product.catalog.name}
                </Td>
                <Td>
                  <Badge variant="default">{product.size}</Badge>
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{product.category}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{product.series}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{product.finish}</Td>
                <Td>
                  {product.hidden ? (
                    <Badge variant="muted">Hidden</Badge>
                  ) : (
                    <Badge variant="success">Visible</Badge>
                  )}
                </Td>
                <Td style={{ textAlign: "right", color: "var(--color-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                  {product.sortOrder}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
