import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyState } from "@/components/admin/Table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await db.projectHighlight.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Project Highlights"
        description={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Title</Th>
            <Th>Location</Th>
            <Th>Type</Th>
            <Th>Tile</Th>
            <Th>Area</Th>
            <Th>Added</Th>
            <Th style={{ textAlign: "right" }}>Sort</Th>
          </tr>
        </Thead>
        <Tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <EmptyState message="No project highlights yet." />
              </td>
            </tr>
          ) : (
            projects.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{p.title}</div>
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{p.location ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{p.type ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{p.tile ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{p.area ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(p.createdAt)}
                </Td>
                <Td style={{ textAlign: "right", color: "var(--color-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                  {p.sortOrder}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
