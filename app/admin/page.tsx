"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/login"); return; }
      const { data: mp } = await supabase.from("employee_profiles").select("*").eq("user_id", u.user.id).single();
      const role = (mp?.role || "").toLowerCase();
      if (!role.includes("admin") && !role.includes("partner")) { router.push("/dashboard"); return; }
      setProfile(mp);
      const [pr, mr, pgr] = await Promise.all([
        supabase.from("employee_profiles").select("*").order("full_name", { ascending: true }),
        supabase.from("training_modules").select("*").order("display_order", { ascending: true }),
        supabase.from("training_progress").select("*"),
      ]);
      setProfiles(pr.data || []); setModules(mr.data || []); setProgress(pgr.data || []);
      setLoading(false);
    })();
  }, [router]);

  const reportUsers = profiles.filter(p => { const r = (p.role || "").toLowerCase(); return r.includes("article") || r.includes("employee"); });
  const getSummary = (uid: string) => {
    const up = progress.filter(p => p.user_id === uid);
    const videos = up.filter(p => p.watched).length;
    const quizzes = up.filter(p => p.quiz_attempted).length;
    const passed = up.filter(p => p.status === "Passed").length;
    const marks = up.filter(p => p.quiz_attempted).map(p => Number(p.marks || 0));
    const avg = marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0;
    const pct = modules.length ? Math.round((passed / modules.length) * 100) : 0;
    const status = pct === 100 ? "Completed" : passed > 0 || videos > 0 ? "In Progress" : "Not Started";
    return { videos, quizzes, passed, avg, pct, status };
  };
  const getModProg = (uid: string, mid: string) => progress.find(p => p.user_id === uid && p.module_id === mid);
  const completed = reportUsers.filter(p => getSummary(p.user_id).status === "Completed").length;
  const inProg = reportUsers.filter(p => getSummary(p.user_id).status === "In Progress").length;
  const notStarted = reportUsers.filter(p => getSummary(p.user_id).status === "Not Started").length;

  if (loading) return <div style={{ marginLeft: 220, padding: "2rem" }}><div className="skeleton" style={{ height: 56, borderRadius: 0, marginBottom: "1.5rem" }} /><div className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: "1rem" }} /></div>;

  const TH = ({ c }: { c: React.ReactNode }) => (
    <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 700, color: "var(--forest)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", background: "#f7f9f5", whiteSpace: "nowrap" }}>{c}</th>
  );
  const TD = ({ c, s }: { c: React.ReactNode; s?: React.CSSProperties }) => (
    <td style={{ padding: "0.65rem 1rem", fontSize: "0.845rem", ...s }}>{c}</td>
  );

  if (selectedUser) {
    const s = getSummary(selectedUser.user_id);
    return (
      <PortalShell isAdminOrPartner profileName={profile?.full_name} pageTitle="Training Report">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <button className="btn btn-o btn-sm" onClick={() => setSelectedUser(null)}>← Back</button>
          <div>
            <span style={{ fontWeight: 800, color: "var(--forest)", fontSize: "1rem" }}>{selectedUser.full_name}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.82rem", marginLeft: "0.5rem" }}>· {selectedUser.role}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
          {[["Videos Done", `${s.videos}/${modules.length}`], ["Quizzes", `${s.quizzes}/${modules.length}`], ["Passed", `${s.passed}/${modules.length}`], ["Avg Marks", `${s.avg}%`]].map(([l, v]) => (
            <div key={l} className="sc"><div className="sv">{v}</div><div className="sl">{l}</div></div>
          ))}
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Module-wise Breakdown</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Module", "Video", "Quiz", "Marks", "Status"].map(h => <TH key={h} c={h} />)}</tr></thead>
            <tbody>
              {modules.map((m, i) => {
                const p = getModProg(selectedUser.user_id, m.id);
                return (
                  <tr key={m.id} style={{ borderBottom: i < modules.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                    <TD c={<><span style={{ color: "var(--muted)", marginRight: 6, fontSize: "0.78rem" }}>{m.display_order}.</span><span style={{ fontWeight: 600 }}>{m.title}</span></>} />
                    <TD c={<span className={`badge ${p?.watched ? "bg" : "by"}`}>{p?.watched ? "Done" : "Pending"}</span>} />
                    <TD c={<span className={`badge ${p?.quiz_attempted ? "bg" : "by"}`}>{p?.quiz_attempted ? "Done" : "Pending"}</span>} />
                    <TD c={<span style={{ fontWeight: 700, color: (p?.marks || 0) >= 70 ? "var(--forest)" : "var(--muted)" }}>{p?.marks || 0}%</span>} />
                    <TD c={<span className={`badge ${p?.status === "Passed" ? "bg" : p?.status === "Failed" ? "br" : "by"}`}>{p?.status || "Not Started"}</span>} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell isAdminOrPartner profileName={profile?.full_name} pageTitle="Reports & Admin">
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>Admin Dashboard</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Training reports, employee management and system controls.</p>
      </div>

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Employee Management", icon: "👥", sub: `${profiles.length} total employees`, href: "/admin/employees" },
          { label: "Laptop Management",   icon: "💻", sub: "Assignments & complaints",            href: "/admin/laptops" },
          { label: "SOP Compliance",      icon: "✅", sub: "Checklists & tracking",               href: "/admin/sop-compliance" },
        ].map(l => (
          <button key={l.href} onClick={() => router.push(l.href)} className="card" style={{ padding: "1.1rem 1.25rem", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.85rem", transition: "border-color 0.13s", border: "1px solid var(--border)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--forest)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
          >
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{l.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text)" }}>{l.label}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>{l.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Training stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        <div className="sc"><div className="sv">{reportUsers.length}</div><div className="sl">Total Users</div></div>
        <div className="sc"><div className="sv">{completed}</div><div className="sl">Completed</div></div>
        <div className="sc"><div className="sv">{inProg}</div><div className="sl">In Progress</div></div>
        <div className="sc"><div className="sv">{notStarted}</div><div className="sl">Not Started</div></div>
      </div>

      {/* Training summary table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
          <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>User-wise Training Summary</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Name", "Role", "Videos", "Quizzes", "Avg Marks", "Overall %", "Status", "Action"].map(h => <TH key={h} c={h} />)}</tr>
            </thead>
            <tbody>
              {reportUsers.map((p, i) => {
                const s = getSummary(p.user_id);
                return (
                  <tr key={p.user_id} style={{ borderBottom: i < reportUsers.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                    <TD c={<span style={{ fontWeight: 700 }}>{p.full_name || "—"}</span>} />
                    <TD c={<span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{p.role}</span>} />
                    <TD c={<span style={{ fontWeight: 600, color: "var(--forest)" }}>{s.videos}/{modules.length}</span>} />
                    <TD c={<span style={{ fontWeight: 600, color: "var(--forest)" }}>{s.quizzes}/{modules.length}</span>} />
                    <TD c={<span style={{ fontWeight: 700, color: s.avg >= 70 ? "var(--forest)" : "var(--muted)" }}>{s.avg}%</span>} />
                    <TD c={
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 80, height: 6, background: "#e8ede8", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: s.pct === 100 ? "#16a34a" : s.pct > 0 ? "var(--forest)" : "#e8ede8", width: `${s.pct}%` }} />
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--forest)", minWidth: 32 }}>{s.pct}%</span>
                      </div>
                    } />
                    <TD c={<span className={`badge ${s.status === "Completed" ? "bg" : s.status === "In Progress" ? "bb" : "by"}`}>{s.status}</span>} />
                    <TD c={<button className="btn btn-p btn-sm" onClick={() => setSelectedUser(p)}>Details</button>} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PortalShell>
  );
}
