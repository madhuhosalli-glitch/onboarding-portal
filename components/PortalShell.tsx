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

export default function PortalShell({
  children, isAdminOrPartner = false, profileName = "", pageTitle = "",
}: {
  children: React.ReactNode; isAdminOrPartner?: boolean; profileName?: string; pageTitle?: string;
}) {
  const router  = useRouter();
  const pathname = usePathname();

  // Instant navigation — no overlay, no delay, no flash
  const go = (href: string) => { if (href !== pathname) router.push(href); };

  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const visible = NAV.filter(n => !n.adminOnly || isAdminOrPartner);

  const S: Record<string, React.CSSProperties> = {
    sidebar: {
      position: "fixed", top: 0, left: 0, bottom: 0, width: 220,
      background: "#1a3a2a", display: "flex", flexDirection: "column",
      zIndex: 100, boxShadow: "2px 0 20px rgba(0,0,0,0.18)",
    },
    logoArea: {
      padding: "1.1rem 1.1rem 0.9rem",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", gap: 10,
    },
    logoText: { color: "#fff", fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.2 },
    logoSub: { color: "#c9a84c", fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const },
    nav: { flex: 1, overflowY: "auto" as const, padding: "0.6rem 0" },
    main: { marginLeft: 220, minHeight: "100vh", background: "#f4f5f0" },
    topbar: {
      background: "#fff", borderBottom: "1px solid #dde5d8", height: 56,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 1.75rem", position: "sticky" as const, top: 0, zIndex: 50,
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    },
    content: { padding: "1.5rem 1.75rem" },
  };

  const navItem = (item: NavItem) => {
    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
    return (
      <button key={item.href} onClick={() => go(item.href)} style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "9px 14px", borderRadius: 9, margin: "2px 9px",
        fontSize: "0.845rem", fontWeight: active ? 700 : 500, cursor: "pointer",
        background: active ? "#c9a84c" : "transparent",
        color: active ? "#1a3a2a" : "rgba(255,255,255,0.70)",
        border: "none", width: "calc(100% - 18px)", textAlign: "left" as const,
        transition: "background 0.13s, color 0.13s",
        boxShadow: active ? "0 2px 10px rgba(201,168,76,0.30)" : "none",
      }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLElement).style.color = "#fff"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.70)"; } }}
      >
        <span style={{ width: 18, textAlign: "center", fontSize: "0.95rem", flexShrink: 0 }}>{item.icon}</span>
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <aside style={S.sidebar}>
        <div style={S.logoArea}>
          <img src="/logo.png" alt="BVC" style={{ height: 38, objectFit: "contain" }} />
          <div>
            <div style={S.logoText}>BVC & Co.</div>
            <div style={S.logoSub}>Office Portal</div>
          </div>
        </div>
        <nav style={S.nav}>{visible.map(navItem)}</nav>
        <div style={{ padding: "0.6rem 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={logout} style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "9px 14px", borderRadius: 9, margin: "2px 9px",
            fontSize: "0.845rem", fontWeight: 500, cursor: "pointer",
            background: "transparent", color: "rgba(255,160,160,0.80)",
            border: "none", width: "calc(100% - 18px)", textAlign: "left",
          }}>
            <span style={{ width: 18, textAlign: "center" }}>⇤</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div style={S.main}>
        <header style={S.topbar}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a3a2a" }}>{pageTitle}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", color: "#888" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button onClick={() => go("/profile")} title="Profile" style={{
              background: "#1a3a2a", color: "#fff", border: "none", borderRadius: "50%",
              width: 34, height: 34, fontWeight: 800, fontSize: "0.8rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {profileName ? profileName.charAt(0).toUpperCase() : "U"}
            </button>
          </div>
        </header>
        <div style={S.content}>{children}</div>
      </div>
    </>
  );
}
