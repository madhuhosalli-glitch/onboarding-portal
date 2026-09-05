"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortalShell from "../../components/PortalShell";

type Laptop = { id: string; asset_tag: string; serial_number: string | null; brand: string | null; model: string | null; processor: string | null; ram: string | null; storage: string | null; operating_system: string | null; warranty_expiry: string | null; condition_notes: string | null; status: string | null; };
type Complaint = { id: string; laptop_id: string | null; subject: string; description: string; priority: string; status: string; admin_notes: string | null; created_at: string; };

export default function LaptopsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(""); const [profile, setProfile] = useState<any>(null);
  const [laptops, setLaptops] = useState<Laptop[]>([]); const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const [laptopId, setLaptopId] = useState(""); const [subject, setSubject] = useState(""); const [desc, setDesc] = useState(""); const [priority, setPriority] = useState("Medium");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/login"); return; }
      const uid = u.user.id; setUserId(uid);
      const [pr, lr, cr] = await Promise.all([
        supabase.from("employee_profiles").select("*").eq("user_id", uid).single(),
        supabase.from("laptop_assignments").select("laptop_id").eq("user_id", uid),
        supabase.from("laptop_complaints").select("*").eq("raised_by", uid).order("created_at", { ascending: false }),
      ]);
      setProfile(pr.data);
      if (lr.data && lr.data.length > 0) {
        const ids = lr.data.map((x: any) => x.laptop_id);
        const { data: laps } = await supabase.from("laptops").select("*").in("id", ids);
        setLaptops(laps || []);
        if (laps && laps.length > 0) setLaptopId(laps[0].id);
      }
      setComplaints(cr.data || []);
      setLoading(false);
    })();
  }, [router]);

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage("");
    const { error } = await supabase.from("laptop_complaints").insert({ raised_by: userId, laptop_id: laptopId || null, subject, description: desc, priority, status: "Open" });
    if (error) { setMessage(error.message); } else {
      setMessage("Complaint raised successfully."); setSubject(""); setDesc(""); setPriority("Medium");
      const { data: cr } = await supabase.from("laptop_complaints").select("*").eq("raised_by", userId).order("created_at", { ascending: false });
      setComplaints(cr || []);
    }
    setSaving(false);
  };

  const role = (profile?.role || "").toLowerCase();
  const isAdminOrPartner = role.includes("admin") || role.includes("partner");

  if (loading) return <div style={{ marginLeft: 220, padding: "2rem" }}><div className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: "1rem" }} /><div className="skeleton" style={{ height: 300, borderRadius: 12 }} /></div>;

  const statusBadge = (s: string) => s === "Resolved" ? "bg" : s === "In Progress" ? "bb" : "by";
  const priorityBadge = (p: string) => p === "High" ? "br" : p === "Low" ? "bg" : "by";

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profile?.full_name} pageTitle="IT Assets">
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>Laptop Support</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>View your assigned laptop and raise support complaints.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        {/* My Laptop */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>My Laptop</span>
          </div>
          {laptops.length === 0 ? (
            <div style={{ padding: "1.5rem 1.25rem", color: "var(--muted)", fontSize: "0.875rem" }}>No laptop assigned.</div>
          ) : laptops.map(lap => (
            <div key={lap.id} style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem" }}>{lap.asset_tag}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{[lap.brand, lap.model].filter(Boolean).join(" · ")}</div>
                </div>
                <span className={`badge ${lap.status === "Active" ? "bg" : "br"}`}>{lap.status || "Unknown"}</span>
              </div>
              {[
                ["Serial No.", lap.serial_number],
                ["Processor",  lap.processor],
                ["RAM",        lap.ram],
                ["Storage",    lap.storage],
                ["OS",         lap.operating_system],
                ["Warranty",   lap.warranty_expiry],
                ["Notes",      lap.condition_notes],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.83rem" }}>
                  <span style={{ color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.72rem" }}>{k}</span>
                  <span style={{ color: "var(--text)", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Raise Complaint */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Raise a Complaint</span>
          </div>
          <form onSubmit={submitComplaint} style={{ padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--forest)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Laptop</label>
              <select className="fi" value={laptopId} onChange={e => setLaptopId(e.target.value)}>
                {laptops.map(l => <option key={l.id} value={l.id}>{l.asset_tag} — {l.model || l.brand}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--forest)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Priority</label>
              <select className="fi" value={priority} onChange={e => setPriority(e.target.value)}>
                {["Low", "Medium", "High"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--forest)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Subject</label>
              <input className="fi" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Battery backup issue" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--forest)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Description</label>
              <textarea className="fi" value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Describe the issue in detail..." required style={{ resize: "vertical" }} />
            </div>
            <button type="submit" disabled={saving} className="btn btn-p" style={{ padding: "0.65rem" }}>{saving ? "Submitting..." : "Submit Complaint"}</button>
            {message && <div style={{ background: "#e8f4ec", borderRadius: 8, padding: "0.6rem 0.9rem", color: "var(--forest)", fontWeight: 600, fontSize: "0.83rem" }}>{message}</div>}
          </form>
        </div>
      </div>

      {/* Complaint history */}
      {complaints.length > 0 && (
        <div className="card" style={{ marginTop: "1.25rem", overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>My Complaints</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.845rem" }}>
            <thead>
              <tr style={{ background: "#f7f9f5" }}>
                {["Subject", "Priority", "Status", "Date", "Admin Notes"].map(h => (
                  <th key={h} style={{ padding: "0.65rem 1.1rem", textAlign: "left", fontWeight: 700, color: "var(--forest)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {complaints.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < complaints.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "0.7rem 1.1rem", fontWeight: 600 }}>{c.subject}</td>
                  <td style={{ padding: "0.7rem 1.1rem" }}><span className={`badge ${priorityBadge(c.priority)}`}>{c.priority}</span></td>
                  <td style={{ padding: "0.7rem 1.1rem" }}><span className={`badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                  <td style={{ padding: "0.7rem 1.1rem", color: "var(--muted)", fontSize: "0.8rem" }}>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                  <td style={{ padding: "0.7rem 1.1rem", color: "var(--muted)", fontSize: "0.8rem" }}>{c.admin_notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
