"use client";

import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

type NavItem = { icon: string; label: string; href: string; adminOnly?: boolean };

const NAV: NavItem[] = [
  { icon: "⊞", label: "Home",            href: "/dashboard" },
  { icon: "▶", label: "Training",        href: "/training" },
  { icon: "💻", label: "IT Assets",      href: "/laptops" },
  { icon: "📚", label: "SOP Library",    href: "/sops" },
  { icon: "✅", label: "SOP Compliance", href: "/admin/sop-compliance", adminOnly: true },
  { icon: "👥", label: "Employees",      href: "/admin/employees",      adminOnly: true },
  { icon: "📊", label: "Reports",        href: "/admin",                adminOnly: true },
  { icon: "👤", label: "Profile",        href: "/profile" },
];

// Precise active check — avoids /admin matching /admin/employees
function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function PortalShell({
  children, isAdminOrPartner = false, profileName = "", pageTitle = "",
}: {
  children: React.ReactNode; isAdminOrPartner?: boolean; profileName?: string; pageTitle?: string;
}) {
  const router  = useRouter();
  const pathname = usePathname();

  const go = (href: string) => { if (href !== pathname) router.push(href); };
  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const visible = NAV.filter(n => !n.adminOnly || isAdminOrPartner);

  return (
    <>
      {/* Sidebar */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 220,
        background: "var(--forest)", display: "flex", flexDirection: "column",
        zIndex: 100, boxShadow: "2px 0 20px rgba(0,0,0,0.18)",
      }}>
        {/* Logo */}
        <div style={{ padding: "1.1rem 1.1rem 0.9rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="BVC" style={{ height: 38, objectFit: "contain" }} />
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.2 }}>BVC & Co.</div>
            <div style={{ color: "var(--gold)", fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Office Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto" as const, padding: "0.6rem 0" }}>
          {visible.map(item => {
            const active = isActive(item.href, pathname);
            return (
              <button key={item.href} onClick={() => go(item.href)} style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "9px 14px", borderRadius: 9, margin: "2px 9px",
                fontSize: "0.845rem", fontWeight: active ? 700 : 500, cursor: "pointer",
                background: active ? "var(--gold)" : "transparent",
                color: active ? "var(--forest)" : "rgba(255,255,255,0.70)",
                border: "none", width: "calc(100% - 18px)", textAlign: "left" as const,
                transition: "background 0.13s, color 0.13s, transform 0.13s",
                boxShadow: active ? "0 2px 10px rgba(201,168,76,0.30)" : "none",
                transform: "translateX(0)",
              }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)";
                    (e.currentTarget as HTMLElement).style.color = "#fff";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.70)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                  }
                }}
              >
                <span style={{ width: 18, textAlign: "center" as const, fontSize: "0.95rem", flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "0.6rem 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={logout} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderRadius: 9, margin: "2px 9px",
            fontSize: "0.845rem", fontWeight: 500, cursor: "pointer", background: "transparent",
            color: "rgba(255,160,160,0.80)", border: "none", width: "calc(100% - 18px)", textAlign: "left" as const,
            transition: "background 0.13s, transform 0.13s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,100,100,0.12)"; (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.transform = "translateX(0)"; }}
          >
            <span style={{ width: 18, textAlign: "center" as const }}>⇤</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ marginLeft: 220, minHeight: "100vh", background: "var(--bg)" }}>
        {/* Topbar */}
        <header style={{
          background: "#fff", borderBottom: "1px solid var(--border)", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1.75rem", position: "sticky" as const, top: 0, zIndex: 50,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--forest)" }}>{pageTitle}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", color: "#888" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button onClick={() => go("/profile")} title="Profile" style={{
              background: "var(--forest)", color: "#fff", border: "none", borderRadius: "50%",
              width: 34, height: 34, fontWeight: 800, fontSize: "0.8rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(26,58,42,0.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              {profileName ? profileName.charAt(0).toUpperCase() : "U"}
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: "1.5rem 1.75rem" }}>{children}</div>
      </div>
    </>
  );
}
