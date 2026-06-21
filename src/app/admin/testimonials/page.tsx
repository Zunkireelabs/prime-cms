import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyState } from "@/components/admin/Table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const testimonials = await db.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Testimonials"
        description={`${testimonials.length} testimonial${testimonials.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Quote</Th>
            <Th>Author</Th>
            <Th>Role</Th>
            <Th>Project</Th>
            <Th>Added</Th>
          </tr>
        </Thead>
        <Tbody>
          {testimonials.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState message="No testimonials yet." />
              </td>
            </tr>
          ) : (
            testimonials.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <div
                    style={{
                      maxWidth: "400px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontStyle: "italic",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </div>
                </Td>
                <Td style={{ fontWeight: 500 }}>{t.author}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{t.role ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{t.project ?? "—"}</Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(t.createdAt)}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
