"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import PortalShell from "../../../../components/PortalShell";

type Checklist = { id: string; name: string; frequency: string; module_id: string };
type Field = { id: string; checklist_id: string; field_key: string; field_label: string; field_type: string; display_order: number; required: boolean };
type Item = { id: string; checklist_id: string; item_text: string; display_order: number };
type Submission = { id: string; checklist_id: string; period_label: string | null; submitted_by_name: string | null; submitted_at: string | null; created_at: string; status: string };

function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--forest)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</label>;
}

export default function ChecklistEntryPage() {
  const router = useRouter();
  const params = useParams();
  const checklistId = Array.isArray(params.checklistId) ? params.checklistId[0] : params.checklistId;
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [periodDate, setPeriodDate] = useState(today);
  const [weekStart, setWeekStart] = useState(today); const [weekEnd, setWeekEnd] = useState(today);
  const [month, setMonth] = useState(currentMonth); const [eventDate, setEventDate] = useState(today);
  const [adminRemarks, setAdminRemarks] = useState("");

  const load = async () => {
    if (!checklistId) return;
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/login"); return; }
    const { data: pr } = await supabase.from("employee_profiles").select("full_name").eq("user_id", auth.user.id).single();
    setProfileName(pr?.full_name || "");
    const [{ data: c }, { data: f }, { data: i }, { data: s }] = await Promise.all([
      supabase.from("operation_checklists").select("*").eq("id", checklistId).single(),
      supabase.from("operation_checklist_fields").select("*").eq("checklist_id", checklistId).order("display_order"),
      supabase.from("operation_sop_items").select("*").eq("checklist_id", checklistId).order("display_order"),
      supabase.from("operation_submissions").select("*").eq("checklist_id", checklistId).order("submitted_at", { ascending: false }),
    ]);
    setChecklist(c || null); setFields(f || []); setItems(i || []); setSubmissions(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [checklistId]);

  const period = useMemo(() => {
    if (!checklist) return { start: today, end: today, label: today };
    if (checklist.frequency === "Daily") return { start: periodDate, end: periodDate, label: periodDate };
    if (checklist.frequency === "Weekly") return { start: weekStart, end: weekEnd, label: `${weekStart} to ${weekEnd}` };
    if (checklist.frequency === "Monthly") {
      const start = `${month}-01`;
      const endDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10);
      return { start, end: endDate, label: month };
    }
    return { start: eventDate, end: eventDate, label: eventDate };
  }, [checklist, periodDate, weekStart, weekEnd, month, eventDate]);

  const submitChecklist = async (e: React.FormEvent) => {
    e.preventDefault(); if (!checklist) return; setSaving(true); setMessage("");
    for (const field of fields) {
      if (field.required && !answers[field.field_key]) { setMessage(`Please fill: ${field.field_label}`); setSaving(false); return; }
    }
    const { data: auth } = await supabase.auth.getUser();
    const { data: prf } = await supabase.from("employee_profiles").select("full_name,official_email,personal_email").eq("user_id", auth.user?.id).single();
    const submittedByName = prf?.full_name || prf?.official_email || "User";
    const { data: sub, error } = await supabase.from("operation_submissions").insert({
      checklist_id: checklist.id, submitted_by: auth.user?.id, submitted_by_name: submittedByName,
      status: "Completed", submission_date: today, submitted_at: new Date().toISOString(),
      period_start: period.start, period_end: period.end, period_label: period.label, admin_remarks: adminRemarks || null,
    }).select().single();
    if (error || !sub) { setMessage("Submission failed: " + (error?.message || "Unknown")); setSaving(false); return; }
    const rows = fields.map(field => ({ submission_id: sub.id, field_id: field.id, field_key: field.field_key, field_label: field.field_label, response_value: answers[field.field_key] || "" }));
    if (rows.length > 0) await supabase.from("operation_submission_answers").insert(rows);
    setAnswers({}); setAdminRemarks(""); setMessage("Checklist submitted successfully."); await load(); setSaving(false);
  };

  const fmtDt = (d?: string | null) => d ? new Date(d).toLocaleString("en-GB") : "—";

  if (loading) return (
    <PortalShell isAdminOrPartner profileName={profileName} pageTitle="SOP Checklist">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.25rem" }}>
        <div className="skeleton" style={{ height: 500, borderRadius: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        </div>
      </div>
    </PortalShell>
  );
  if (!checklist) return <PortalShell isAdminOrPartner profileName={profileName} pageTitle="Not Found"><p style={{ color: "#991b1b" }}>Checklist not found.</p></PortalShell>;

  const renderPeriod = () => {
    if (checklist.frequency === "Daily") return (
      <div><Lbl>Checklist Date</Lbl><input type="date" value={periodDate} onChange={e => setPeriodDate(e.target.value)} className="fi" /></div>
    );
    if (checklist.frequency === "Weekly") return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div><Lbl>Week Start</Lbl><input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="fi" /></div>
        <div><Lbl>Week End</Lbl><input type="date" value={weekEnd} onChange={e => setWeekEnd(e.target.value)} className="fi" /></div>
      </div>
    );
    if (checklist.frequency === "Monthly") return (
      <div><Lbl>Month</Lbl><input type="month" value={month} onChange={e => setMonth(e.target.value)} className="fi" /></div>
    );
    return <div><Lbl>Event Date</Lbl><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="fi" /></div>;
  };

  const renderField = (field: Field) => {
    const val = answers[field.field_key] || "";
    const lbl = `${field.field_label}${field.required ? " *" : ""}`;
    if (field.field_type === "yesno") return (
      <div key={field.id}><Lbl>{lbl}</Lbl>
        <select value={val} onChange={e => setAnswers(a => ({ ...a, [field.field_key]: e.target.value }))} className="fi">
          <option value="">Select</option>
          <option>Yes</option><option>No</option><option>Not Applicable</option>
        </select>
      </div>
    );
    if (field.field_type === "textarea") return (
      <div key={field.id}><Lbl>{lbl}</Lbl>
        <textarea value={val} onChange={e => setAnswers(a => ({ ...a, [field.field_key]: e.target.value }))} className="fi" rows={3} style={{ resize: "vertical" }} />
      </div>
    );
    const inputType = ["time", "date"].includes(field.field_type) ? field.field_type : "text";
    return (
      <div key={field.id}><Lbl>{lbl}</Lbl>
        <input type={inputType} value={val} onChange={e => setAnswers(a => ({ ...a, [field.field_key]: e.target.value }))} className="fi" />
      </div>
    );
  };

  return (
    <PortalShell isAdminOrPartner profileName={profileName} pageTitle={checklist.name}>
      {/* Back */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button className="btn btn-o btn-sm" onClick={() => router.push("/admin/sop-compliance")}>← SOP Compliance</button>
        <div>
          <span style={{ fontWeight: 800, color: "var(--forest)", fontSize: "1rem" }}>{checklist.name}</span>
          <span style={{ color: "var(--muted)", fontSize: "0.82rem", marginLeft: "0.6rem" }}>· {checklist.frequency}</span>
        </div>
      </div>

      {message && (
        <div style={{ background: message.includes("failed") || message.includes("Please") ? "#fee2e2" : "#e8f4ec", borderRadius: 9, padding: "0.7rem 1rem", color: message.includes("failed") || message.includes("Please") ? "#991b1b" : "var(--forest)", fontWeight: 600, fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.25rem", alignItems: "start" }}>
        {/* Form */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Submit Checklist</span>
          </div>
          <form onSubmit={submitChecklist} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {renderPeriod()}
            <div style={{ background: "#f0f5f0", borderRadius: 8, padding: "0.65rem 0.9rem", fontSize: "0.82rem", color: "var(--forest)", fontWeight: 600 }}>
              Period: <strong>{period.label}</strong>
            </div>
            {fields.map(renderField)}
            <div>
              <Lbl>Remarks (Optional)</Lbl>
              <textarea value={adminRemarks} onChange={e => setAdminRemarks(e.target.value)} className="fi" rows={3} style={{ resize: "vertical" }} placeholder="Any remarks or notes..." />
            </div>
            <button type="submit" disabled={saving} className="btn btn-p" style={{ padding: "0.72rem" }}>
              {saving ? "Submitting..." : "Submit Checklist"}
            </button>
          </form>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "72px" }}>
          {/* SOP Items */}
          {items.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
                <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.85rem" }}>SOP Items</span>
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {items.map((item, i) => (
                  <div key={item.id} style={{ padding: "0.65rem 1.1rem", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", display: "flex", gap: "0.65rem", fontSize: "0.83rem", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--gold)", fontWeight: 800, flexShrink: 0, minWidth: 20 }}>{i + 1}.</span>
                    <span style={{ color: "var(--text)" }}>{item.item_text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent submissions */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid var(--border)", background: "#fafaf8" }}>
              <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.85rem" }}>Recent History</span>
            </div>
            {submissions.length === 0 ? (
              <p style={{ padding: "1rem 1.1rem", color: "var(--muted)", fontSize: "0.83rem" }}>No submissions yet.</p>
            ) : (
              submissions.slice(0, 8).map((s, i) => (
                <div key={s.id} style={{ padding: "0.65rem 1.1rem", borderBottom: i < Math.min(submissions.length, 8) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text)" }}>{s.period_label || "—"}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{s.submitted_by_name} · {fmtDt(s.submitted_at || s.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
