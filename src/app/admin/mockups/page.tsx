import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, Badge, EmptyState } from "@/components/admin/Table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MockupsPage() {
  const mockups = await db.roomMockup.findMany({
    include: { _count: { select: { featuredProducts: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Room Mockups"
        description={`${mockups.length} mockup${mockups.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Title</Th>
            <Th>Room Type</Th>
            <Th>Products</Th>
            <Th>Status</Th>
            <Th>Added</Th>
            <Th style={{ textAlign: "right" }}>Sort</Th>
          </tr>
        </Thead>
        <Tbody>
          {mockups.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState message="No room mockups yet." />
              </td>
            </tr>
          ) : (
            mockups.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{m.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    {m.slug}
                  </div>
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{m.roomType ?? "—"}</Td>
                <Td>
                  <Badge variant="default">{m._count.featuredProducts}</Badge>
                </Td>
                <Td>
                  {m.hidden ? (
                    <Badge variant="muted">Hidden</Badge>
                  ) : (
                    <Badge variant="success">Visible</Badge>
                  )}
                </Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(m.createdAt)}
                </Td>
                <Td style={{ textAlign: "right", color: "var(--color-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                  {m.sortOrder}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
