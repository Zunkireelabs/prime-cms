"use client";

import { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead
      style={{
        background: "var(--color-surface-alt)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {children}
    </thead>
  );
}

export function Th({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      style={{
        padding: "10px 16px",
        textAlign: "left",
        fontSize: "11px",
        fontWeight: 600,
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Tr({ children, href }: { children: ReactNode; href?: string }) {
  if (href) {
    return (
      <tr
        style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            "var(--color-surface-alt)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "transparent")
        }
        onClick={() => (window.location.href = href)}
      >
        {children}
      </tr>
    );
  }
  return (
    <tr
      style={{ borderBottom: "1px solid var(--color-border)" }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background =
          "var(--color-surface-alt)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background = "transparent")
      }
    >
      {children}
    </tr>
  );
}

export function Td({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <td
      style={{
        padding: "12px 16px",
        fontSize: "13px",
        color: "var(--color-text)",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
}) {
  const colors = {
    default: { bg: "rgba(181, 138, 82, 0.15)", color: "var(--color-accent)" },
    success: { bg: "rgba(34, 197, 94, 0.15)", color: "var(--color-success)" },
    warning: { bg: "rgba(245, 158, 11, 0.15)", color: "var(--color-warning)" },
    danger: { bg: "rgba(239, 68, 68, 0.15)", color: "var(--color-danger)" },
    muted: { bg: "var(--color-surface-raised)", color: "var(--color-text-muted)" },
  };
  const c = colors[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 500,
        background: c.bg,
        color: c.color,
      }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
        color: "var(--color-text-faint)",
        fontSize: "13px",
      }}
    >
      {message}
    </div>
  );
}
