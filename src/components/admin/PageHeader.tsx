import Link from "next/link";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: "28px",
        gap: "16px",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: description ? "4px" : 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: "var(--color-accent)",
            color: "#0a0a0a",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 600,
            flexShrink: 0,
            transition: "background var(--transition-base)",
          }}
        >
          <Plus size={14} />
          {action.label}
        </Link>
      )}
    </div>
  );
}
