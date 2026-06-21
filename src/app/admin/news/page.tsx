import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import { Table, Thead, Th, Tbody, Tr, Td, Badge, EmptyState } from "@/components/admin/Table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const articles = await db.newsArticle.findMany({
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="News Articles"
        description={`${articles.length} article${articles.length !== 1 ? "s" : ""}`}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Title</Th>
            <Th>Source</Th>
            <Th>Date</Th>
            <Th>Featured</Th>
            <Th>Added</Th>
          </tr>
        </Thead>
        <Tbody>
          {articles.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState message="No news articles yet." />
              </td>
            </tr>
          ) : (
            articles.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{a.title}</div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      marginTop: "2px",
                      maxWidth: "400px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.summary}
                  </div>
                </Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{a.source}</Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(a.date)}
                </Td>
                <Td>
                  {a.featured ? (
                    <Badge variant="success">Featured</Badge>
                  ) : (
                    <span style={{ color: "var(--color-text-faint)", fontSize: "12px" }}>No</span>
                  )}
                </Td>
                <Td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {formatDate(a.createdAt)}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
