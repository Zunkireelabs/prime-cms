import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyState } from "@/components/admin/Table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DealersPage() {
  const dealers = await db.dealer.findMany({
    orderBy: [{ province: "asc" }, { city: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Dealers"
        description={`${dealers.length} dealer${dealers.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>City</Th>
            <Th>Province</Th>
            <Th>Phone</Th>
            <Th>Contact Person</Th>
            <Th>Added</Th>
          </tr>
        </Thead>
        <Tbody>
          {dealers.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState message="No dealers yet." />
              </td>
            </tr>
          ) : (
            dealers.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{d.name}</div>
                  {d.address && (
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {d.address}
                    </div>
                  )}
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{d.city}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{d.province}</Td>
                <Td style={{ color: "var(--color-text-muted)", fontFamily: "monospace", fontSize: "12px" }}>
                  {d.phone ?? "—"}
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{d.contactPerson ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(d.createdAt)}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
