"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Grid3x3,
  BookOpen,
  Image,
  Newspaper,
  Building2,
  MessageSquare,
  Home,
  MapPin,
  Briefcase,
  Trophy,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Products", href: "/admin/products", icon: Grid3x3 },
  { label: "Catalogs", href: "/admin/catalogs", icon: BookOpen },
  { label: "Hero Banners", href: "/admin/banners", icon: Image },
  { label: "News", href: "/admin/news", icon: Newspaper },
  { label: "Projects", href: "/admin/projects", icon: Building2 },
  { label: "Testimonials", href: "/admin/testimonials", icon: MessageSquare },
  { label: "Room Mockups", href: "/admin/mockups", icon: Home },
  { label: "Dealers", href: "/admin/dealers", icon: MapPin },
  { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { label: "Project Refs", href: "/admin/project-testimonials", icon: Trophy },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: "220px",
        minWidth: "220px",
        height: "100vh",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "2px",
            fontWeight: 500,
          }}
        >
          Admin
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          Prime Ceramics
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 10px",
        }}
      >
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                    background: active ? "rgba(181, 138, 82, 0.1)" : "transparent",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: active ? 500 : 400,
                    transition: "all var(--transition-base)",
                    borderLeft: active
                      ? "2px solid var(--color-accent)"
                      : "2px solid transparent",
                  }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--color-border)",
          flexShrink: 0,
          fontSize: "11px",
          color: "var(--color-text-faint)",
        }}
      >
        v0.1.0
      </div>
    </aside>
  );
}
