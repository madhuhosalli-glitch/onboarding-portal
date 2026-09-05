"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

type NavItem = {
  icon: string;
  label: string;
  href: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: "⊞", label: "Home",          href: "/dashboard" },
  { icon: "▶", label: "Training",      href: "/training" },
  { icon: "💻", label: "IT Assets",    href: "/laptops" },
  { icon: "📚", label: "SOP Library",  href: "/sops" },
  { icon: "✅", label: "SOP Compliance", href: "/admin/sop-compliance", adminOnly: true },
  { icon: "👥", label: "Employees",    href: "/admin/employees", adminOnly: true },
  { icon: "📊", label: "Reports",      href: "/admin", adminOnly: true },
  { icon: "👤", label: "Profile",      href: "/profile" },
];

export default function PortalShell({
  children,
  isAdminOrPartner = false,
  profileName = "",
  pageTitle = "",
}: {
  children: React.ReactNode;
  isAdminOrPartner?: boolean;
  profileName?: string;
  pageTitle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Instant navigation — fade out, push route, fade in handled by CSS animation on new page
  const navigate = (href: string) => {
    if (href === pathname) return;
    const overlay = document.getElementById("page-transition-overlay");
    if (overlay) {
      overlay.classList.add("active");
      setTimeout(() => {
        router.push(href);
        // Fade out overlay after new page mounts (next tick)
        setTimeout(() => overlay.classList.remove("active"), 80);
      }, 120);
    } else {
      router.push(href);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdminOrPartner
  );

  return (
    <>
      {/* Sidebar */}
      <aside className="bvc-sidebar">
        {/* Logo area */}
        <div style={{ padding: "1.25rem 1.1rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.png" alt="BVC Logo" style={{ height: 40, objectFit: "contain", filter: "brightness(1.1)" }} />
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.02em" }}>BVC & Co.</div>
              <div style={{ color: "var(--gold)", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Office Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0" }}>
          {visibleNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                className={`nav-item${isActive ? " active" : ""}`}
                onClick={() => navigate(item.href)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "0.75rem 0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button className="nav-item" onClick={handleLogout} style={{ color: "rgba(255,180,180,0.85)" }}>
            <span className="nav-icon">⇤</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="bvc-main">
        {/* Top bar */}
        <header className="bvc-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {pageTitle && (
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--forest)" }}>{pageTitle}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
            <button
              onClick={() => navigate("/profile")}
              style={{
                background: "var(--forest)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 36, height: 36,
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
              title="Profile"
            >
              {profileName ? profileName.charAt(0).toUpperCase() : "U"}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="bvc-content page-enter">
          {children}
        </div>
      </div>
    </>
  );
}
