"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import PortalShell from "../../../components/PortalShell";

type ChecklistRow = { id: string; module_id: string; name: string; frequency: string; display_order: number; active: boolean };
type ModuleRow = { id: string; name: string; display_order: number };
type Profile = { user_id: string; full_name: string | null; official_email: string | null; personal_email: string | null; role: string | null };
type Assignment = { id: string; checklist_id: string; employee_user_id: string; active: boolean };
type Submission = { id: string; checklist_id: string; status: string; submission_date: string | null; period_label: string | null; submitted_by_name: string | null; submitted_at: string | null; created_at: string };
type SopItem = { id: string; checklist_id: string; item_text: string; display_order: number };

export default function SopCompliancePage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRow[]>([]); const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]); const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]); const [items, setItems] = useState<SopItem[]>([]);
  const [myUserId, setMyUserId] = useState(""); const [profileName, setProfileName] = useState(""); const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(""); const [search, setSearch] = useState(""); const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [assignChecklist, setAssignChecklist] = useState<ChecklistRow | null>(null); const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [sopChecklist, setSopChecklist] = useState<ChecklistRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/login"); return; }
    setMyUserId(auth.user.id);
    const { data: myP } = await supabase.from("employee_profiles").select("*").eq("user_id", auth.user.id).single();
    const role = (myP?.role || "").toLowerCase();
    if (!role.includes("admin") && !role.includes("partner")) { router.push("/dashboard"); return; }
    setProfileName(myP?.full_name || "");
    const [{ data: mods }, { data: cls }, { data: profs }, { data: assigns }, { data: subs }, { data: sopItems }] = await Promise.all([
      supabase.from("operation_modules").select("*").order("display_order"),
      supabase.from("operation_checklists").select("*").eq("active", true).order("display_order"),
      supabase.from("employee_profiles").select("user_id,full_name,official_email,personal_email,role").order("full_name"),
      supabase.from("operation_assignments").select("*").eq("active", true),
      supabase.from("operation_submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("operation_sop_items").select("*").order("display_order"),
    ]);
    setModules(mods || []); setChecklists(cls || []); setProfiles(profs || []);
    setAssignments(assigns || []); setSubmissions(subs || []); setItems(sopItems || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getAssigned = (cid: string) => {
    const ids = assignments.filter(a => a.checklist_id === cid).map(a => a.employee_user_id);
    if (ids.length === 0) return "Not assigned";
    return ids.map(id => { const p = profiles.find(x => x.user_id === id); return p?.full_name || p?.official_email || "User"; }).join(", ");
  };
  const getLastSub = (cid: string) => submissions.find(s => s.checklist_id === cid);
  const getSopItems = (cid: string) => items.filter(i => i.checklist_id === cid);
  const completedToday = submissions.filter(s => s.submission_date === new Date().toISOString().slice(0, 10)).length;
  const assignedToMe = assignments.filter(a => a.employee_user_id === myUserId).length;
  const fmtDt = (d?: string | null) => d ? new Date(d).toLocaleString("en-GB") : "—";
  const freqColor = (f: string) => ({ Daily: "#2c5f2e", Weekly: "#1e4080", Monthly: "#6b2080" }[f] || "#805f1e");

  const filtered = useMemo(() => checklists.filter(c => {
    if (viewMode === "mine" && !assignments.some(a => a.checklist_id === c.id && a.employee_user_id === myUserId)) return false;
    const mod = modules.find(m => m.id === c.module_id)?.name || "";
    return `${mod} ${c.name} ${c.frequency} ${getAssigned(c.id)}`.toLowerCase().includes(search.toLowerCase());
  }), [checklists, modules, assignments, search, viewMode, myUserId]);

  const openAssign = (c: ChecklistRow) => {
    const cur: Record<string, boolean> = {};
    assignments.filter(a => a.checklist_id === c.id).forEach(a => (cur[a.employee_user_id] = true));
    setSelectedUsers(cur); setAssignChecklist(c);
  };

  const saveAssign = async () => {
    if (!assignChecklist) return;
    await supabase.from("operation_assignments").update({ active: false }).eq("checklist_id", assignChecklist.id);
    const rows = Object.entries(selectedUsers).filter(([, v]) => v).map(([uid]) => ({ checklist_id: assignChecklist.id, employee_user_id: uid, active: true }));
    if (rows.length > 0) await supabase.from("operation_assignments").insert(rows);
    setMessage("Assignment saved."); setAssignChecklist(null); await load();
  };

  if (loading) return (
    <PortalShell isAdminOrPartner profileName="" pageTitle="SOP Compliance">
      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="skeleton" style={{ height: 28, width: 200, borderRadius: 6, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 300, borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 78, borderRadius: 12 }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />)}
      </div>
    </PortalShell>
  );

  return (
    <PortalShell isAdminOrPartner profileName={profileName} pageTitle="SOP Compliance">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>SOP Compliance</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Assign checklists, track submissions and manage compliance.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="fi" style={{ width: 200 }} />
          <button className={`btn btn-sm ${viewMode === "all" ? "btn-p" : "btn-o"}`} onClick={() => setViewMode("all")}>All</button>
          <button className={`btn btn-sm ${viewMode === "mine" ? "btn-p" : "btn-o"}`} onClick={() => setViewMode("mine")}>Assigned to Me</button>
        </div>
      </div>

      {message && <div style={{ background: "#e8f4ec", borderRadius: 9, padding: "0.7rem 1rem", color: "var(--forest)", fontWeight: 600, fontSize: "0.85rem", marginBottom: "1rem" }}>{message}</div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        <div className="sc"><div className="sv">{checklists.length}</div><div className="sl">Total Checklists</div></div>
        <div className="sc"><div className="sv">{assignedToMe}</div><div className="sl">Assigned to Me</div></div>
        <div className="sc"><div className="sv">{completedToday}</div><div className="sl">Completed Today</div></div>
        <div className="sc"><div className="sv">{submissions.length}</div><div className="sl">Total Submissions</div></div>
      </div>

      {/* Grouped checklists */}
      {modules.map(mod => {
        const cls = filtered.filter(c => c.module_id === mod.id);
        if (cls.length === 0) return null;
        return (
          <div key={mod.id} style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem", marginBottom: "0.6rem", padding: "0 0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>{mod.name}</span>
              <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.78rem" }}>({cls.length} checklists)</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.85rem" }}>
              {cls.map(cl => {
                const last = getLastSub(cl.id);
                const submitted = !!last;
                return (
                  <div key={cl.id} className="hover-card" style={{ overflow: "hidden", borderLeft: `3px solid ${freqColor(cl.frequency)}` }}>
                    <div style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem" }}>{cl.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>{cl.frequency}</div>
                        </div>
                        <span className={`badge ${submitted ? "bg" : "by"}`}>{submitted ? "Submitted" : "Pending"}</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
                        <div>Assigned: {getAssigned(cl.id)}</div>
                        {last && <div>Last: {last.period_label || "—"} · {fmtDt(last.submitted_at || last.created_at)}</div>}
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                        <button className="btn btn-p btn-sm" onClick={() => router.push(`/admin/sop-compliance/${cl.id}`)}>Open Checklist</button>
                        <button className="btn btn-o btn-sm" onClick={() => setSopChecklist(cl)}>SOP Items</button>
                        <button className="btn btn-g btn-sm" onClick={() => openAssign(cl)}>Assign</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Assign modal */}
      {assignChecklist && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={e => { if (e.target === e.currentTarget) setAssignChecklist(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, maxWidth: 520, width: "100%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "1.1rem 1.4rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
              <div style={{ fontWeight: 800, color: "var(--forest)" }}>Assign — {assignChecklist.name}</div>
              <button className="btn btn-o btn-sm" onClick={() => setAssignChecklist(null)}>Close</button>
            </div>
            <div style={{ padding: "1rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {profiles.map(p => (
                <label key={p.user_id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.875rem" }}>
                  <input type="checkbox" checked={!!selectedUsers[p.user_id]} onChange={e => setSelectedUsers({ ...selectedUsers, [p.user_id]: e.target.checked })} style={{ accentColor: "var(--forest)", width: 16, height: 16 }} />
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.full_name || p.official_email || "Unknown"}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{p.role}</span>
                </label>
              ))}
              <button className="btn btn-p" style={{ marginTop: "0.75rem", padding: "0.65rem" }} onClick={saveAssign}>Save Assignment</button>
            </div>
          </div>
        </div>
      )}

      {/* SOP Items modal */}
      {sopChecklist && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={e => { if (e.target === e.currentTarget) setSopChecklist(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, maxWidth: 580, width: "100%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "1.1rem 1.4rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
              <div style={{ fontWeight: 800, color: "var(--forest)" }}>SOP Items — {sopChecklist.name}</div>
              <button className="btn btn-o btn-sm" onClick={() => setSopChecklist(null)}>Close</button>
            </div>
            <div style={{ padding: "1rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {getSopItems(sopChecklist.id).map((item, i) => (
                <div key={item.id} style={{ display: "flex", gap: "0.75rem", padding: "0.65rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--gold)", fontWeight: 800, flexShrink: 0, minWidth: 24 }}>{i + 1}.</span>
                  <span style={{ color: "var(--text)", lineHeight: 1.5 }}>{item.item_text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
