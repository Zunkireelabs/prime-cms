"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

interface HeaderProps {
  userEmail?: string | null;
  title?: string;
}

export default function Header({ userEmail, title }: HeaderProps) {
  return (
    <header
      style={{
        height: "56px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        flexShrink: 0,
      }}
    >
      {/* Page title */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--color-text)",
        }}
      >
        {title || "Admin"}
      </div>

      {/* User area */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {userEmail && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--color-text-muted)",
              fontSize: "13px",
            }}
          >
            <User size={14} />
            {userEmail}
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "transparent",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "5px",
            color: "var(--color-text-muted)",
            fontSize: "12px",
            cursor: "pointer",
            transition: "all var(--transition-base)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--color-danger)";
            el.style.color = "var(--color-danger)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--color-border-subtle)";
            el.style.color = "var(--color-text-muted)";
          }}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </header>
  );
}
