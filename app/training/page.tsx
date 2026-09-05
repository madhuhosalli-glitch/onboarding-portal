"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

type TrainingModule = {
  id: string; title: string; description: string; display_order?: number;
  progress?: { status: string; marks: number; quiz_attempted: boolean; } | null;
};

export default function TrainingPage() {
  const router = useRouter();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [profileName, setProfileName] = useState("");

  const navigate = (href: string) => {
    const overlay = document.getElementById("page-transition-overlay");
    if (overlay) { overlay.classList.add("active"); setTimeout(() => { router.push(href); setTimeout(() => overlay.classList.remove("active"), 80); }, 120); }
    else router.push(href);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) { router.replace("/login"); return; }
        const [pr, mr, pgr] = await Promise.all([
          supabase.from("employee_profiles").select("full_name,role").eq("user_id", userData.user.id).maybeSingle(),
          supabase.from("training_modules").select("id,title,description,display_order").order("display_order", { ascending: true }),
          supabase.from("training_progress").select("module_id,status,marks,quiz_attempted").eq("user_id", userData.user.id),
        ]);
        if (cancelled) return;
        if (!pr.data?.full_name) { router.replace("/dashboard"); return; }
        setRole(pr.data.role || ""); setProfileName(pr.data.full_name || "");
        const pm = new Map((pgr.data || []).map((p) => [p.module_id, p]));
        setModules((mr.data || []).map((m) => ({ ...m, progress: pm.get(m.id) || null })));
      } catch (e) { console.error(e); } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [router]);

  const summary = useMemo(() => {
    const completed = modules.filter((m) => m.progress?.status === "Passed").length;
    const attempted = modules.filter((m) => m.progress?.quiz_attempted);
    const avg = attempted.length ? Math.round(attempted.reduce((s, m) => s + Number(m.progress?.marks || 0), 0) / attempted.length) : 0;
    return { completed, avg };
  }, [modules]);

  const isAdminOrPartner = role.toLowerCase().includes("admin") || role.toLowerCase().includes("partner");

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--forest)", fontWeight: 700 }}>Loading training modules...</div>
    </div>
  );

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profileName} pageTitle="Training & Learning">
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>Training & Learning</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Complete assigned onboarding modules, attempt quizzes and track your learning progress.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Modules", value: modules.length },
          { label: "Completed", value: summary.completed },
          { label: "Average Score", value: `${summary.avg}%` },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--gold)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--forest)" }}>Overall Progress</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--gold)" }}>{summary.completed}/{modules.length}</span>
          </div>
          <div style={{ height: 8, background: "#e8ede8", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--forest)", borderRadius: 4, width: `${modules.length > 0 ? (summary.completed / modules.length) * 100 : 0}%`, transition: "width 0.4s" }} />
          </div>
        </div>
      </div>

      {/* Module grid */}
      {modules.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>No training modules available.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {modules.map((mod) => {
            const status = mod.progress?.status;
            const badge = status === "Passed" ? "badge-green" : status === "Failed" ? "badge-red" : "badge-yellow";
            const badgeLabel = status || "Not Started";
            return (
              <div key={mod.id} className="module-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                  <div style={{ background: "var(--forest)", color: "#fff", borderRadius: 8, padding: "0.25rem 0.6rem", fontSize: "0.72rem", fontWeight: 700 }}>
                    Module {mod.display_order || ""}
                  </div>
                  <span className={`badge ${badge}`}>{badgeLabel}</span>
                </div>
                <h3 style={{ fontWeight: 700, color: "var(--forest)", fontSize: "1rem", marginBottom: "0.4rem" }}>{mod.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.5, marginBottom: "1rem" }}>{mod.description}</p>
                {mod.progress?.quiz_attempted && (
                  <div style={{ fontSize: "0.8rem", color: "var(--forest-mid)", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Score: {mod.progress.marks}%
                  </div>
                )}
                <button onClick={() => navigate(`/training/${mod.id}`)} className="btn-primary" style={{ width: "100%", padding: "0.6rem" }}>
                  {status === "Passed" ? "Review Module" : status === "Failed" ? "Retake Module" : "Start Module"} →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
