"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

function Input({ label, value, onChange, type = "text", disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        disabled={disabled} required={!disabled} className="form-input"
        style={disabled ? { background: "#f0f0ea", color: "#888" } : {}} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [sroNumber, setSroNumber] = useState("");
  const [foundationMarks, setFoundationMarks] = useState("");
  const [ipccGroup1Marks, setIpccGroup1Marks] = useState("");
  const [ipccGroup2Marks, setIpccGroup2Marks] = useState("");

  const role = (profile?.role || "").toLowerCase();
  const isArticle = role.includes("article");
  const isAdminOrPartner = role.includes("admin") || role.includes("partner");
  const passwordNotChanged = profile && profile.password_changed !== true;
  const articleProfileIncomplete = isArticle && (!profile?.personal_email || !profile?.mobile_number || !profile?.sro_number || !profile?.foundation_marks || !profile?.ipcc_group1_marks || !profile?.ipcc_group2_marks);
  const normalProfileIncomplete = !isArticle && (!profile?.personal_email || !profile?.mobile_number);
  const needsFirstLoginForm = articleProfileIncomplete || normalProfileIncomplete;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) { router.replace("/login"); return; }
        const uid = userData.user.id;
        if (!cancelled) { setUserId(uid); setUserEmail(userData.user.email || ""); }
        const [pr, mr, pgr] = await Promise.all([
          supabase.from("employee_profiles").select("user_id,full_name,personal_email,mobile_number,sro_number,foundation_marks,ipcc_group1_marks,ipcc_group2_marks,role,password_changed").eq("user_id", uid).single(),
          supabase.from("training_modules").select("id,title,description,display_order").order("display_order", { ascending: true }),
          supabase.from("training_progress").select("module_id,status,quiz_attempted,marks,watched").eq("user_id", uid),
        ]);
        if (cancelled) return;
        const p = pr.data;
        setProfile(p); setFullName(p?.full_name || ""); setPersonalEmail(p?.personal_email || "");
        setMobileNumber(p?.mobile_number || ""); setSroNumber(p?.sro_number || "");
        setFoundationMarks(p?.foundation_marks || ""); setIpccGroup1Marks(p?.ipcc_group1_marks || "");
        setIpccGroup2Marks(p?.ipcc_group2_marks || ""); setModules(mr.data || []); setProgress(pgr.data || []);
      } catch (e) { console.error(e); } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true); setMessage("");
    if (newPassword.length < 8) { setMessage("Password must be at least 8 characters."); setSaving(false); return; }
    if (newPassword !== confirmPassword) { setMessage("Passwords do not match."); setSaving(false); return; }
    const { error: pe } = await supabase.auth.updateUser({ password: newPassword });
    if (pe) { setMessage("Password change failed: " + pe.message); setSaving(false); return; }
    await supabase.from("employee_profiles").update({ password_changed: true }).eq("user_id", userId);
    setProfile((prev: any) => ({ ...prev, password_changed: true }));
    setNewPassword(""); setConfirmPassword("");
    setMessage("Password changed successfully. Please complete your profile.");
    setSaving(false);
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true); setMessage("");
    const updateData: any = { user_id: userId, full_name: fullName, personal_email: personalEmail, mobile_number: mobileNumber };
    if (isArticle) { updateData.sro_number = sroNumber; updateData.foundation_marks = foundationMarks; updateData.ipcc_group1_marks = ipccGroup1Marks; updateData.ipcc_group2_marks = ipccGroup2Marks; }
    const { error } = await supabase.from("employee_profiles").upsert(updateData, { onConflict: "user_id" });
    if (error) { setMessage("Error: " + error.message); setSaving(false); return; }
    const { data: up } = await supabase.from("employee_profiles").select("*").eq("user_id", userId).single();
    setProfile(up); setMessage("Profile saved successfully."); setSaving(false);
  };

  const completedTraining = progress.filter((p) => p.status === "Passed").length;
  const attemptedTraining = progress.filter((p) => p.quiz_attempted).length;
  const pendingTraining = Math.max(modules.length - completedTraining, 0);
  const trainingPercent = modules.length > 0 ? Math.round((completedTraining / modules.length) * 100) : 0;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  }, []);

  const navigate = (href: string) => {
    const overlay = document.getElementById("page-transition-overlay");
    if (overlay) { overlay.classList.add("active"); setTimeout(() => { router.push(href); setTimeout(() => overlay.classList.remove("active"), 80); }, 120); }
    else router.push(href);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--forest)" }}>
      <div style={{ color: "var(--gold)", fontWeight: 700, fontSize: "1.1rem" }}>Loading BVC Office Portal...</div>
    </div>
  );

  if (passwordNotChanged) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div className="card" style={{ padding: "2rem", borderTop: "4px solid var(--forest)" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--forest)", marginBottom: "0.5rem" }}>Change Default Password</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>For security, please set a new password before accessing the portal.<br /><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>{userEmail}</span></p>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Input label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
            <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
            <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "0.75rem" }}>{saving ? "Changing..." : "Change Password"}</button>
            {message && <p style={{ color: saving ? "var(--muted)" : "var(--forest-mid)", fontWeight: 600, fontSize: "0.88rem" }}>{message}</p>}
          </form>
        </div>
      </div>
    </div>
  );

  if (needsFirstLoginForm) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "2rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ background: "var(--forest)", borderRadius: 14, padding: "1.5rem 2rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800 }}>Welcome, {fullName || "Team Member"}</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", marginTop: 4 }}>Please complete your profile to access the portal.</p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="btn-gold" style={{ whiteSpace: "nowrap" }}>Logout</button>
        </div>
        <div className="card" style={{ padding: "2rem" }}>
          <h2 style={{ fontWeight: 700, color: "var(--forest)", marginBottom: "0.25rem" }}>First Login Details</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Complete this once to activate your portal profile.</p>
          <form onSubmit={handleSaveProfile} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Input label="Full Name" value={fullName} onChange={setFullName} />
            <Input label="Personal Email" type="email" value={personalEmail} onChange={setPersonalEmail} />
            <Input label="Mobile Number" value={mobileNumber} onChange={setMobileNumber} />
            <Input label="Role" value={profile?.role || "-"} onChange={() => {}} disabled />
            {isArticle && (<>
              <Input label="SRO Number" value={sroNumber} onChange={setSroNumber} />
              <Input label="Foundation Marks" value={foundationMarks} onChange={setFoundationMarks} />
              <Input label="IPCC Group 1 Marks" value={ipccGroup1Marks} onChange={setIpccGroup1Marks} />
              <Input label="IPCC Group 2 Marks" value={ipccGroup2Marks} onChange={setIpccGroup2Marks} />
            </>)}
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "0.75rem 2rem" }}>{saving ? "Saving..." : "Save and Continue"}</button>
              {message && <p style={{ color: "var(--forest-mid)", fontWeight: 600, fontSize: "0.85rem" }}>{message}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const quickLinks = [
    { icon: "▶", label: "Training", sub: `${completedTraining}/${modules.length} done`, href: "/training", accent: "var(--forest)" },
    { icon: "💻", label: "IT Assets", sub: "Laptop support", href: "/laptops", accent: "#2c5f8e" },
    { icon: "📚", label: "SOP Library", sub: "Office manuals", href: "/sops", accent: "#5f4a2c" },
    ...(isAdminOrPartner ? [
      { icon: "✅", label: "SOP Compliance", sub: "Checklists", href: "/admin/sop-compliance", accent: "#2c5f4a" },
      { icon: "👥", label: "Employees", sub: "Directory", href: "/admin/employees", accent: "#4a2c5f" },
      { icon: "📊", label: "Reports", sub: "Admin panel", href: "/admin", accent: "#5f2c2c" },
    ] : []),
  ];

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profile?.full_name} pageTitle="Home">
      {/* Greeting banner */}
      <div style={{
        background: "var(--forest)",
        borderRadius: 14,
        padding: "1.5rem 2rem",
        marginBottom: "1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div>
          <div style={{ color: "var(--gold)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>BVC Office Portal</div>
          <h1 style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 800, marginBottom: 4 }}>{greeting}, {profile?.full_name || "Team Member"} 👋</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem" }}>Welcome to your internal office workspace.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.4rem 0.85rem", color: "var(--gold)", fontSize: "0.8rem", fontWeight: 700 }}>{profile?.role || "User"}</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Training Progress", value: `${trainingPercent}%`, sub: `${completedTraining} of ${modules.length} passed` },
          { label: "Pending Training", value: pendingTraining, sub: "modules remaining" },
          { label: "Quiz Attempted", value: attemptedTraining, sub: "modules attempted" },
          { label: "Your Role", value: profile?.role || "-", sub: "access level" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick access grid */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 700, color: "var(--forest)", fontSize: "1rem", marginBottom: "0.9rem", letterSpacing: "0.02em" }}>Quick Access</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          {quickLinks.map((ql) => (
            <button key={ql.href} onClick={() => navigate(ql.href)} style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.1rem 1.25rem",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ql.accent; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px rgba(0,0,0,0.09)`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div style={{ background: ql.accent, borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{ql.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem" }}>{ql.label}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>{ql.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        {[
          { title: "Today's Tasks", items: [`${pendingTraining} training module${pendingTraining !== 1 ? "s" : ""} pending`, "Review assigned SOP checklists", "Check laptop support status"] },
          { title: "Announcements", items: ["BVC Office Portal is now live", "Use office.bvcai.in for production", "New SOP compliance module added"] },
          { title: "Upcoming", items: ["Monthly SOP compliance", "IT asset verification", "Training module completion"] },
        ].map((panel) => (
          <div key={panel.title} className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.92rem", marginBottom: "0.85rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>{panel.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {panel.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.83rem", color: "var(--muted)" }}>
                  <span style={{ color: "var(--gold)", fontWeight: 800, marginTop: 1 }}>◆</span>{item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
