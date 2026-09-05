"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

export default function SOPLibraryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [sops, setSops] = useState<any[]>([]);
  const [readStatus, setReadStatus] = useState<any[]>([]);
  const [selectedSop, setSelectedSop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canMarkRead, setCanMarkRead] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/login"); return; }
      const [pr, cr, sr, rsr] = await Promise.all([
        supabase.from("employee_profiles").select("*").eq("user_id", u.user.id).single(),
        supabase.from("sop_categories").select("*").order("display_order", { ascending: true }),
        supabase.from("sops").select("*").eq("active", true).order("display_order", { ascending: true }),
        supabase.from("sop_read_status").select("*").eq("user_id", u.user.id),
      ]);
      setProfile(pr.data); setCategories(cr.data || []); setSops(sr.data || []); setReadStatus(rsr.data || []);
      setLoading(false);
    })();
  }, [router]);

  const isRead = (sopId: string) => readStatus.some(r => r.sop_id === sopId);
  const totalRead = readStatus.length;
  const role = (profile?.role || "").toLowerCase();
  const isAdminOrPartner = role.includes("admin") || role.includes("partner");

  const openSop = async (sop: any) => {
    setSelectedSop(sop);
    setCanMarkRead(!isRead(sop.id));
    setMessage("");
  };

  const markRead = async () => {
    if (!profile || !selectedSop) return;
    const { error } = await supabase.from("sop_read_status").insert({ user_id: profile.user_id, sop_id: selectedSop.id, read_at: new Date().toISOString() });
    if (!error) { setReadStatus(prev => [...prev, { sop_id: selectedSop.id }]); setCanMarkRead(false); setMessage("Marked as read."); }
  };

  const filteredSops = sops.filter(s =>
    !search || `${s.title} ${s.description || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <PortalShell isAdminOrPartner={false} profileName="" pageTitle="SOP Library">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 78, borderRadius: 12 }} />)}
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <div className="skeleton" style={{ height: 18, width: 160, borderRadius: 4 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {[1,2,3].map(j => (
              <div key={j} style={{ padding: "0.9rem 1.25rem", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <div className="skeleton" style={{ height: 16, width: "80%", borderRadius: 4, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: "60%", borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </PortalShell>
  );

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profile?.full_name} pageTitle="SOP Library">
      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>SOP Library</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Office manuals and department-wise procedures.</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SOPs..." className="fi" style={{ width: 240 }} />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        <div className="sc"><div className="sv">{sops.length}</div><div className="sl">Total SOPs</div></div>
        <div className="sc"><div className="sv">{totalRead}</div><div className="sl">Read</div></div>
        <div className="sc"><div className="sv">{sops.length > 0 ? Math.round((totalRead / sops.length) * 100) : 0}%</div><div className="sl">Completion</div></div>
      </div>

      {/* Categories */}
      {categories.map(cat => {
        const catSops = filteredSops.filter(s => s.category_id === cat.id);
        if (catSops.length === 0) return null;
        const catRead = catSops.filter(s => isRead(s.id)).length;
        return (
          <div key={cat.id} className="card" style={{ marginBottom: "1rem", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafaf8" }}>
              <div>
                <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.95rem" }}>{cat.name}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.78rem", marginLeft: "0.5rem" }}>{catRead}/{catSops.length} read</span>
              </div>
              <div style={{ width: 80, height: 5, background: "#e8ede8", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--forest)", width: `${catSops.length ? (catRead / catSops.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 0 }}>
              {catSops.map((sop, i) => (
                <div key={sop.id} style={{ padding: "0.9rem 1.25rem", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f0f5f0"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text)" }}>{sop.display_order}. {sop.title}</span>
                      {isRead(sop.id) && <span className="badge bg" style={{ fontSize: "0.65rem" }}>Read</span>}
                      {!isRead(sop.id) && <span className="badge by" style={{ fontSize: "0.65rem" }}>Pending</span>}
                    </div>
                    {sop.description && <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>{sop.description}</p>}
                  </div>
                  <button className="btn btn-p btn-sm" onClick={() => openSop(sop)} style={{ flexShrink: 0 }}>Open</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal */}
      {selectedSop && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedSop(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, maxWidth: 680, width: "100%", maxHeight: "88vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
              <div>
                <h2 style={{ fontWeight: 800, color: "var(--forest)", fontSize: "1.1rem" }}>{selectedSop.title}</h2>
                {selectedSop.description && <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 2 }}>{selectedSop.description}</p>}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                {canMarkRead && <button className="btn btn-g btn-sm" onClick={markRead}>Mark as Read</button>}
                <button className="btn btn-o btn-sm" onClick={() => setSelectedSop(null)}>Close</button>
              </div>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              {message && <div style={{ background: "#e8f4ec", borderRadius: 8, padding: "0.6rem 0.9rem", color: "var(--forest)", fontWeight: 600, fontSize: "0.85rem", marginBottom: "1rem" }}>{message}</div>}
              {selectedSop.content ? (
                <div style={{ fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text)", whiteSpace: "pre-wrap" }}>{selectedSop.content}</div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No content available for this SOP.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
