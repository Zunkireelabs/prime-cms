import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyState } from "@/components/admin/Table";

export const dynamic = "force-dynamic";

export default async function ProjectTestimonialsPage() {
  const items = await db.projectTestimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { project: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Project Testimonials"
        description={`${items.length} project${items.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Project</Th>
            <Th>Location</Th>
            <Th>Type</Th>
            <Th>Tile</Th>
            <Th>Size</Th>
            <Th>Area</Th>
            <Th style={{ textAlign: "right" }}>Sort</Th>
          </tr>
        </Thead>
        <Tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <EmptyState message="No project testimonials yet." />
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <Tr key={item.id}>
                <Td style={{ fontWeight: 500 }}>{item.project}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{item.location ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{item.type ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{item.tile ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{item.size ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{item.area ?? "—"}</Td>
                <Td style={{ textAlign: "right", color: "var(--color-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                  {item.sortOrder}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
