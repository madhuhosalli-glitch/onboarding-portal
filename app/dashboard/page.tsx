"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

function Inp({ label, value, onChange, type = "text", disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--forest)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={!disabled} className="fi" style={disabled ? { background: "#f0f0ea", color: "#999" } : {}} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(""); const [userEmail, setUserEmail] = useState(""); const [profile, setProfile] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]); const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState("");
  const [fullName, setFullName] = useState(""); const [personalEmail, setPersonalEmail] = useState(""); const [mobile, setMobile] = useState("");
  const [sro, setSro] = useState(""); const [fnd, setFnd] = useState(""); const [g1, setG1] = useState(""); const [g2, setG2] = useState("");

  const role = (profile?.role || "").toLowerCase();
  const isArticle = role.includes("article");
  const isAdminOrPartner = role.includes("admin") || role.includes("partner");
  const pwNotChanged = profile && profile.password_changed !== true;
  const articleIncomplete = isArticle && (!profile?.personal_email || !profile?.mobile_number || !profile?.sro_number || !profile?.foundation_marks || !profile?.ipcc_group1_marks || !profile?.ipcc_group2_marks);
  const normalIncomplete = !isArticle && (!profile?.personal_email || !profile?.mobile_number);
  const needsForm = articleIncomplete || normalIncomplete;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u, error } = await supabase.auth.getUser();
        if (error || !u.user) { router.replace("/login"); return; }
        const uid = u.user.id;
        if (!cancelled) { setUserId(uid); setUserEmail(u.user.email || ""); }
        const [pr, mr, pgr] = await Promise.all([
          supabase.from("employee_profiles").select("user_id,full_name,personal_email,mobile_number,sro_number,foundation_marks,ipcc_group1_marks,ipcc_group2_marks,role,password_changed").eq("user_id", uid).single(),
          supabase.from("training_modules").select("id,title,display_order").order("display_order", { ascending: true }),
          supabase.from("training_progress").select("module_id,status,quiz_attempted,marks").eq("user_id", uid),
        ]);
        if (cancelled) return;
        const p = pr.data;
        setProfile(p); setFullName(p?.full_name || ""); setPersonalEmail(p?.personal_email || "");
        setMobile(p?.mobile_number || ""); setSro(p?.sro_number || ""); setFnd(p?.foundation_marks || "");
        setG1(p?.ipcc_group1_marks || ""); setG2(p?.ipcc_group2_marks || "");
        setModules(mr.data || []); setProgress(pgr.data || []);
      } catch (e) { console.error(e); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage("");
    if (newPw.length < 8) { setMessage("Password must be at least 8 characters."); setSaving(false); return; }
    if (newPw !== confPw) { setMessage("Passwords do not match."); setSaving(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setMessage(error.message); setSaving(false); return; }
    await supabase.from("employee_profiles").update({ password_changed: true }).eq("user_id", userId);
    setProfile((p: any) => ({ ...p, password_changed: true }));
    setNewPw(""); setConfPw(""); setMessage("Password changed. Please complete your profile."); setSaving(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage("");
    const d: any = { user_id: userId, full_name: fullName, personal_email: personalEmail, mobile_number: mobile };
    if (isArticle) { d.sro_number = sro; d.foundation_marks = fnd; d.ipcc_group1_marks = g1; d.ipcc_group2_marks = g2; }
    const { error } = await supabase.from("employee_profiles").upsert(d, { onConflict: "user_id" });
    if (error) { setMessage(error.message); setSaving(false); return; }
    const { data: up } = await supabase.from("employee_profiles").select("*").eq("user_id", userId).single();
    setProfile(up); setMessage("Profile saved successfully."); setSaving(false);
  };

  const completed = progress.filter(p => p.status === "Passed").length;
  const attempted = progress.filter(p => p.quiz_attempted).length;
  const pending = Math.max(modules.length - completed, 0);
  const pct = modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0;
  const greeting = useMemo(() => { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"; }, []);

  const centreCard: React.CSSProperties = { maxWidth: 520, margin: "6rem auto", background: "#fff", borderRadius: 14, border: "1px solid var(--border)", padding: "2rem" };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--forest)" }}>
      <div style={{ color: "var(--gold)", fontWeight: 700 }}>Loading...</div>
    </div>
  );

  if (pwNotChanged) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "2rem" }}>
      <div style={centreCard}>
        <div style={{ borderLeft: "4px solid var(--forest)", paddingLeft: "0.85rem", marginBottom: "1.5rem" }}>
          <h1 style={{ fontWeight: 800, color: "var(--forest)", fontSize: "1.35rem" }}>Set New Password</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 4 }}>Required before accessing the portal · {userEmail}</p>
        </div>
        <form onSubmit={handleChangePw} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Inp label="New Password" type="password" value={newPw} onChange={setNewPw} />
          <Inp label="Confirm Password" type="password" value={confPw} onChange={setConfPw} />
          <button type="submit" disabled={saving} className="btn btn-p" style={{ padding: "0.7rem" }}>{saving ? "Saving..." : "Set Password"}</button>
          {message && <p style={{ color: "var(--forest-mid)", fontWeight: 600, fontSize: "0.85rem" }}>{message}</p>}
        </form>
      </div>
    </div>
  );

  if (needsForm) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "2rem" }}>
      <div style={{ maxWidth: 640, margin: "3rem auto", background: "#fff", borderRadius: 14, border: "1px solid var(--border)", padding: "2rem" }}>
        <div style={{ borderLeft: "4px solid var(--forest)", paddingLeft: "0.85rem", marginBottom: "1.5rem" }}>
          <h1 style={{ fontWeight: 800, color: "var(--forest)", fontSize: "1.35rem" }}>Complete Your Profile</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 4 }}>One-time setup · {userEmail}</p>
        </div>
        <form onSubmit={handleSaveProfile} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Inp label="Full Name" value={fullName} onChange={setFullName} />
          <Inp label="Personal Email" type="email" value={personalEmail} onChange={setPersonalEmail} />
          <Inp label="Mobile Number" value={mobile} onChange={setMobile} />
          <Inp label="Role" value={profile?.role || "-"} onChange={() => {}} disabled />
          {isArticle && (<>
            <Inp label="SRO Number" value={sro} onChange={setSro} />
            <Inp label="Foundation Marks" value={fnd} onChange={setFnd} />
            <Inp label="IPCC Group 1" value={g1} onChange={setG1} />
            <Inp label="IPCC Group 2" value={g2} onChange={setG2} />
          </>)}
          <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
            <button type="submit" disabled={saving} className="btn btn-p" style={{ padding: "0.65rem 1.75rem" }}>{saving ? "Saving..." : "Save & Continue"}</button>
            <button type="button" className="btn btn-o" onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}>Logout</button>
            {message && <span style={{ color: "var(--forest-mid)", fontWeight: 600, fontSize: "0.85rem" }}>{message}</span>}
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profile?.full_name} pageTitle="Home">
      {/* Greeting */}
      <div style={{ background: "var(--forest)", borderRadius: 12, padding: "1.4rem 1.75rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ color: "var(--gold)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Welcome back</div>
          <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.2 }}>{greeting}, {profile?.full_name || "Team Member"} 👋</h1>
        </div>
        <span style={{ background: "rgba(201,168,76,0.18)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8, padding: "0.35rem 0.85rem", fontSize: "0.8rem", fontWeight: 700 }}>{profile?.role || "User"}</span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Training Progress",  value: `${pct}%` },
          { label: "Modules Completed",  value: `${completed}/${modules.length}` },
          { label: "Quizzes Attempted",  value: attempted },
          { label: "Pending Modules",    value: pending },
        ].map(s => (
          <div key={s.label} className="sc">
            <div className="sv">{s.value}</div>
            <div className="sl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Training progress bar */}
      <div className="card" style={{ padding: "1.1rem 1.4rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.88rem" }}>Overall Training Progress</span>
          <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: "0.88rem" }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: "#e8ede8", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--forest)", borderRadius: 4, width: `${pct}%`, transition: "width 0.5s" }} />
        </div>
        <div style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--muted)" }}>{completed} of {modules.length} modules passed · {pending} remaining</div>
      </div>

      {/* Recent modules */}
      {modules.length > 0 && (
        <div className="card" style={{ overflow: "hidden", marginBottom: "1.25rem" }}>
          <div style={{ padding: "1rem 1.4rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Training Modules</span>
            <button className="btn btn-p btn-sm" onClick={() => router.push("/training")}>View All →</button>
          </div>
          <div>
            {modules.slice(0, 5).map((mod, i) => {
              const p = progress.find(x => x.module_id === mod.id);
              const status = p?.status;
              return (
                <div key={mod.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.4rem", borderBottom: i < 4 ? "1px solid var(--border)" : "none", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--forest)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>{mod.display_order}</div>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>{mod.title}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className={`badge ${status === "Passed" ? "bg" : status === "Failed" ? "br" : "by"}`}>{status || "Not Started"}</span>
                    <button className="btn btn-o btn-sm" onClick={() => router.push(`/training/${mod.id}`)}>Open →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin quick links */}
      {isAdminOrPartner && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
          {[
            { label: "Employee Management", icon: "👥", href: "/admin/employees", sub: "View all employees" },
            { label: "SOP Compliance",      icon: "✅", href: "/admin/sop-compliance", sub: "Assign & track checklists" },
            { label: "Reports & Admin",     icon: "📊", href: "/admin", sub: "Training reports" },
          ].map(link => (
            <button key={link.href} onClick={() => router.push(link.href)} className="card" style={{ padding: "1.1rem 1.25rem", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "#fff", display: "flex", alignItems: "center", gap: "0.85rem", transition: "border-color 0.13s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--forest)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{link.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text)" }}>{link.label}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>{link.sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
