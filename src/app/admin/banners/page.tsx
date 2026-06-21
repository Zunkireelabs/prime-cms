import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, Badge, EmptyState } from "@/components/admin/Table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const banners = await db.heroBanner.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Hero Banners"
        description={`${banners.length} banner${banners.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Title</Th>
            <Th>Collection</Th>
            <Th>CTA</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th style={{ textAlign: "right" }}>Sort</Th>
          </tr>
        </Thead>
        <Tbody>
          {banners.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState message="No hero banners yet." />
              </td>
            </tr>
          ) : (
            banners.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{b.title}</div>
                  {b.tagline && (
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {b.tagline}
                    </div>
                  )}
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{b.collection ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{b.cta}</Td>
                <Td>
                  {b.active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="muted">Inactive</Badge>
                  )}
                </Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(b.createdAt)}
                </Td>
                <Td style={{ textAlign: "right", color: "var(--color-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                  {b.sortOrder}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
