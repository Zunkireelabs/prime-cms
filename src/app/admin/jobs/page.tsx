import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, Badge, EmptyState } from "@/components/admin/Table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await db.jobOpening.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Job Openings"
        description={`${jobs.length} position${jobs.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Title</Th>
            <Th>Team</Th>
            <Th>Location</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Posted</Th>
          </tr>
        </Thead>
        <Tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState message="No job openings yet." />
              </td>
            </tr>
          ) : (
            jobs.map((j) => (
              <Tr key={j.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{j.title}</div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      marginTop: "2px",
                      maxWidth: "300px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {j.summary}
                  </div>
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{j.team}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{j.location}</Td>
                <Td>
                  <Badge variant="default">{j.type}</Badge>
                </Td>
                <Td>
                  {j.active ? (
                    <Badge variant="success">Open</Badge>
                  ) : (
                    <Badge variant="muted">Closed</Badge>
                  )}
                </Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(j.createdAt)}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
