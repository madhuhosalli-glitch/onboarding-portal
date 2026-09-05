"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.replace("/login"); return; }
      const [pr, pgr] = await Promise.all([
        supabase.from("employee_profiles").select("*").eq("user_id", u.user.id).single(),
        supabase.from("training_progress").select(`*, training_modules(title, display_order)`).eq("user_id", u.user.id),
      ]);
      setProfile(pr.data); setProgress(pgr.data || []); setLoading(false);
    })();
  }, [router]);

  if (loading) return <div style={{ padding: "2rem", color: "var(--forest)", fontWeight: 700 }}>Loading...</div>;

  const role = (profile?.role || "").toLowerCase();
  const isAdminOrPartner = role.includes("admin") || role.includes("partner");
  const isArticle = role.includes("article");

  const fields = [
    ["Full Name",       profile?.full_name],
    ["Official Email",  profile?.official_email || profile?.email],
    ["Personal Email",  profile?.personal_email],
    ["Mobile Number",   profile?.mobile_number],
    ["Role",            profile?.role],
    ["Designation",     profile?.designation],
  ].filter(([, v]) => v);

  const articleFields = [
    ["SRO Number",        profile?.sro_number],
    ["Foundation Marks",  profile?.foundation_marks],
    ["IPCC Group 1",      profile?.ipcc_group1_marks],
    ["IPCC Group 2",      profile?.ipcc_group2_marks],
  ].filter(([, v]) => v);

  const sortedProgress = [...progress].sort((a, b) => (a.training_modules?.display_order || 0) - (b.training_modules?.display_order || 0));

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profile?.full_name} pageTitle="Profile">
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>My Profile</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Your personal details and training progress.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        {/* Personal Details */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Personal Details</span>
          </div>
          <div style={{ padding: "0.5rem 1.25rem" }}>
            {fields.map(([k, v]) => (
              <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{k}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", textAlign: "right", maxWidth: "58%" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Academic details or role info */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>{isArticle ? "Academic Details" : "Access Details"}</span>
          </div>
          <div style={{ padding: "0.5rem 1.25rem" }}>
            {isArticle && articleFields.length > 0 ? (
              articleFields.map(([k, v]) => (
                <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{k}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>{v}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: "1rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Access Level</span>
                  <span className={`badge ${isAdminOrPartner ? "bb" : "bg"}`}>{isAdminOrPartner ? "Admin / Partner" : "Employee"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Password Changed</span>
                  <span className={`badge ${profile?.password_changed ? "bg" : "br"}`}>{profile?.password_changed ? "Yes" : "No"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Training Progress */}
      {sortedProgress.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Training Progress</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.845rem" }}>
            <thead>
              <tr style={{ background: "#f7f9f5" }}>
                {["Module", "Video", "Quiz", "Marks", "Status"].map(h => (
                  <th key={h} style={{ padding: "0.65rem 1.1rem", textAlign: "left", fontWeight: 700, color: "var(--forest)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProgress.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < sortedProgress.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "0.7rem 1.1rem", fontWeight: 600 }}>{p.training_modules?.display_order}. {p.training_modules?.title}</td>
                  <td style={{ padding: "0.7rem 1.1rem" }}><span className={`badge ${p.watched ? "bg" : "by"}`}>{p.watched ? "Completed" : "Pending"}</span></td>
                  <td style={{ padding: "0.7rem 1.1rem" }}><span className={`badge ${p.quiz_attempted ? "bg" : "by"}`}>{p.quiz_attempted ? "Attempted" : "Locked"}</span></td>
                  <td style={{ padding: "0.7rem 1.1rem", fontWeight: 600, color: p.marks > 0 ? "var(--forest)" : "var(--muted)" }}>{p.marks !== null && p.marks !== undefined ? `${p.marks}%` : "—"}</td>
                  <td style={{ padding: "0.7rem 1.1rem" }}><span className={`badge ${p.status === "Passed" ? "bg" : p.status === "Failed" ? "br" : "by"}`}>{p.status || "In Progress"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
