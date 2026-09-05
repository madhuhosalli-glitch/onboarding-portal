"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

type TrainingModule = {
  id: string; title: string; description: string; display_order?: number;
  progress?: { status: string; marks: number; quiz_attempted: boolean; } | null;
};

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--border)", padding: "1.4rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div className="skeleton" style={{ height: 26, width: 80, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 22, width: 90, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ height: 20, width: "70%", borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 14, width: "90%", borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 14, width: "75%", borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 38, borderRadius: 8, marginTop: "0.25rem" }} />
    </div>
  );
}

export default function TrainingPage() {
  const router = useRouter();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) { router.replace("/login"); return; }
        const [pr, mr, pgr] = await Promise.all([
          supabase.from("employee_profiles").select("full_name,role").eq("user_id", u.user.id).maybeSingle(),
          supabase.from("training_modules").select("id,title,description,display_order").order("display_order", { ascending: true }),
          supabase.from("training_progress").select("module_id,status,marks,quiz_attempted").eq("user_id", u.user.id),
        ]);
        if (cancelled) return;
        if (!pr.data?.full_name) { router.replace("/dashboard"); return; }
        setRole(pr.data.role || ""); setProfileName(pr.data.full_name || "");
        const pm = new Map((pgr.data || []).map(p => [p.module_id, p]));
        setModules((mr.data || []).map(m => ({ ...m, progress: pm.get(m.id) || null })));
      } catch (e) { console.error(e); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const summary = useMemo(() => {
    const completed = modules.filter(m => m.progress?.status === "Passed").length;
    const attempted = modules.filter(m => m.progress?.quiz_attempted);
    const avg = attempted.length ? Math.round(attempted.reduce((s, m) => s + Number(m.progress?.marks || 0), 0) / attempted.length) : 0;
    return { completed, avg };
  }, [modules]);

  const isAdminOrPartner = role.toLowerCase().includes("admin") || role.toLowerCase().includes("partner");

  const statusInfo = (status?: string | null) => {
    if (status === "Passed") return { cls: "bg", label: "Passed" };
    if (status === "Failed") return { cls: "br", label: "Failed" };
    if (status === "Viewed by Admin/Partner") return { cls: "bb", label: "Viewed" };
    if (status === "Video Completed") return { cls: "bgold", label: "Video Done" };
    return { cls: "by", label: "Not Started" };
  };

  const btnLabel = (status?: string | null) => {
    if (status === "Passed") return "Review →";
    if (status === "Failed") return "Retake →";
    return "Start →";
  };

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profileName} pageTitle="Training & Learning">
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>Training & Learning</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Complete assigned onboarding modules, attempt quizzes and track your learning progress.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {loading ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 78, borderRadius: 12 }} />) : (
          <>
            <div className="sc"><div className="sv">{modules.length}</div><div className="sl">Total Modules</div></div>
            <div className="sc"><div className="sv">{summary.completed}</div><div className="sl">Completed</div></div>
            <div className="sc"><div className="sv">{summary.avg > 0 ? `${summary.avg}%` : "—"}</div><div className="sl">Average Score</div></div>
          </>
        )}
      </div>

      {/* Progress bar */}
      {!loading && modules.length > 0 && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.87rem" }}>Overall Progress</span>
            <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: "0.87rem" }}>{summary.completed}/{modules.length}</span>
          </div>
          <div style={{ height: 8, background: "#e8ede8", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--forest)", borderRadius: 4, width: `${modules.length > 0 ? (summary.completed / modules.length) * 100 : 0}%`, transition: "width 0.5s" }} />
          </div>
        </div>
      )}

      {/* Module grid — with hover cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
        {loading ? [1,2,3,4,5,6].map(i => <SkeletonCard key={i} />) : (
          modules.map(mod => {
            const { cls, label } = statusInfo(mod.progress?.status);
            return (
              <div key={mod.id} className="module-card" style={{ padding: "1.4rem", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                  <div style={{ background: "var(--forest)", color: "#fff", borderRadius: 8, padding: "0.25rem 0.65rem", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.04em" }}>
                    Module {mod.display_order}
                  </div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                <h3 style={{ fontWeight: 800, color: "var(--forest)", fontSize: "1rem", marginBottom: "0.35rem", lineHeight: 1.3 }}>{mod.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5, marginBottom: "0.85rem", flex: 1 }}>{mod.description}</p>
                {mod.progress?.quiz_attempted && (
                  <div style={{ fontSize: "0.78rem", color: "var(--forest-mid)", fontWeight: 700, marginBottom: "0.65rem" }}>
                    Score: {mod.progress.marks}%
                  </div>
                )}
                <button onClick={() => router.push(`/training/${mod.id}`)} className="btn btn-p" style={{ width: "100%", padding: "0.62rem", marginTop: "auto" }}>
                  {btnLabel(mod.progress?.status)}
                </button>
              </div>
            );
          })
        )}
      </div>
    </PortalShell>
  );
}
