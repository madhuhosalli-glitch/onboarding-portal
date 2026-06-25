"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Checklist = { id: string; name: string; frequency: string; module_id: string };
type Field = { id: string; checklist_id: string; field_key: string; field_label: string; field_type: string; display_order: number; required: boolean };
type Item = { id: string; checklist_id: string; item_text: string; display_order: number };
type Submission = { id: string; checklist_id: string; period_label: string | null; period_start: string | null; period_end: string | null; submitted_by_name: string | null; submitted_at: string | null; created_at: string; status: string };

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [periodDate, setPeriodDate] = useState(today);
  const [weekStart, setWeekStart] = useState(today);
  const [weekEnd, setWeekEnd] = useState(today);
  const [month, setMonth] = useState(currentMonth);
  const [eventDate, setEventDate] = useState(today);
  const [adminRemarks, setAdminRemarks] = useState("");

  const loadData = async () => {
    if (!checklistId) return;
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    const [{ data: c }, { data: f }, { data: i }, { data: s }] = await Promise.all([
      supabase.from("operation_checklists").select("*").eq("id", checklistId).single(),
      supabase.from("operation_checklist_fields").select("*").eq("checklist_id", checklistId).order("display_order"),
      supabase.from("operation_sop_items").select("*").eq("checklist_id", checklistId).order("display_order"),
      supabase.from("operation_submissions").select("*").eq("checklist_id", checklistId).order("submitted_at", { ascending: false }),
    ]);

    setChecklist(c || null);
    setFields(f || []);
    setItems(i || []);
    setSubmissions(s || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [checklistId]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [checklistId]);

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

  const setAnswer = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const submitChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checklist) return;
    setSaving(true);
    setMessage("");

    for (const field of fields) {
      if (field.required && !answers[field.field_key]) {
        setMessage(`Please fill: ${field.field_label}`);
        setSaving(false);
        return;
      }
    }

    const { data: auth } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("employee_profiles")
      .select("full_name, official_email, personal_email")
      .eq("user_id", auth.user?.id)
      .single();

    const submittedByName = profile?.full_name || profile?.official_email || profile?.personal_email || "User";

    const { data: sub, error } = await supabase
      .from("operation_submissions")
      .insert({
        checklist_id: checklist.id,
        submitted_by: auth.user?.id || null,
        submitted_by_name: submittedByName,
        status: "Completed",
        submission_date: today,
        submitted_at: new Date().toISOString(),
        period_start: period.start,
        period_end: period.end,
        period_label: period.label,
        admin_remarks: adminRemarks || null,
      })
      .select()
      .single();

    if (error || !sub) {
      setMessage("Submission failed: " + (error?.message || "Unknown error"));
      setSaving(false);
      return;
    }

    const rows = fields.map((field) => ({
      submission_id: sub.id,
      field_id: field.id,
      field_key: field.field_key,
      field_label: field.field_label,
      response_value: answers[field.field_key] || "",
    }));

    if (rows.length > 0) {
      const { error: ansError } = await supabase.from("operation_submission_answers").insert(rows);
      if (ansError) {
        setMessage("Checklist saved, but answers failed: " + ansError.message);
        setSaving(false);
        return;
      }
    }

    setAnswers({});
    setAdminRemarks("");
    setMessage("Checklist submitted successfully.");
    await loadData();
    setSaving(false);
  };

  const formatDateTime = (date?: string | null) => (date ? new Date(date).toLocaleString("en-GB") : "-");

  if (loading) return <div className="p-10 text-xl font-bold text-slate-900">Loading checklist...</div>;
  if (!checklist) return <div className="p-10 text-xl font-bold text-red-700">Checklist not found.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 to-indigo-950 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">{checklist.name}</h1>
              <p className="mt-2 text-indigo-100">Frequency: {checklist.frequency}</p>
            </div>
            <button onClick={() => router.push("/admin/sop-compliance")} className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900">Back to SOP Compliance</button>
          </div>
        </div>

        {message && <div className="rounded-2xl bg-blue-50 p-4 font-bold text-blue-900 ring-1 ring-blue-200">{message}</div>}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-2xl font-extrabold text-slate-950">Submit Checklist</h2>
            <form onSubmit={submitChecklist} className="mt-6 space-y-5">
              <PeriodSelector checklist={checklist} periodDate={periodDate} setPeriodDate={setPeriodDate} weekStart={weekStart} setWeekStart={setWeekStart} weekEnd={weekEnd} setWeekEnd={setWeekEnd} month={month} setMonth={setMonth} eventDate={eventDate} setEventDate={setEventDate} />

              <div className="rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
                <p className="text-sm font-bold text-indigo-900">Period: {period.label}</p>
                <p className="text-xs font-semibold text-indigo-700">Submitted-at record will be captured separately at the time of submission.</p>
              </div>

              {fields.map((field) => (
                <FieldInput key={field.id} field={field} value={answers[field.field_key] || ""} onChange={(value) => setAnswer(field.field_key, value)} />
              ))}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">Remarks</label>
                <textarea value={adminRemarks} onChange={(e) => setAdminRemarks(e.target.value)} className="min-h-28 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-indigo-600" />
              </div>

              <button disabled={saving} className="rounded-2xl bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800 disabled:opacity-60">{saving ? "Submitting..." : "Submit Checklist"}</button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
              <h2 className="text-2xl font-extrabold text-slate-950">SOP Items</h2>
              <div className="mt-4 space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="font-bold text-slate-900">{index + 1}. {item.item_text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
              <h2 className="text-2xl font-extrabold text-slate-950">Recent History</h2>
              <div className="mt-4 space-y-3">
                {submissions.slice(0, 10).map((s) => (
                  <div key={s.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="font-bold text-slate-950">{s.period_label || "-"}</p>
                    <p className="text-sm font-semibold text-slate-700">By: {s.submitted_by_name || "-"}</p>
                    <p className="text-sm text-slate-600">Submitted: {formatDateTime(s.submitted_at || s.created_at)}</p>
                  </div>
                ))}
                {submissions.length === 0 && <p className="font-semibold text-slate-700">No submissions yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PeriodSelector({ checklist, periodDate, setPeriodDate, weekStart, setWeekStart, weekEnd, setWeekEnd, month, setMonth, eventDate, setEventDate }: any) {
  if (checklist.frequency === "Daily") {
    return <Input label="Checklist Date" type="date" value={periodDate} onChange={setPeriodDate} />;
  }
  if (checklist.frequency === "Weekly") {
    return <div className="grid gap-4 md:grid-cols-2"><Input label="Week Start Date" type="date" value={weekStart} onChange={setWeekStart} /><Input label="Week End Date" type="date" value={weekEnd} onChange={setWeekEnd} /></div>;
  }
  if (checklist.frequency === "Monthly") {
    return <Input label="Month" type="month" value={month} onChange={setMonth} />;
  }
  return <Input label="Event Date" type="date" value={eventDate} onChange={setEventDate} />;
}

function FieldInput({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) {
  if (field.field_type === "yesno") {
    return <div><label className="mb-2 block text-sm font-bold text-slate-800">{field.field_label}{field.required ? " *" : ""}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-indigo-600"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option><option value="Not Applicable">Not Applicable</option></select></div>;
  }
  if (field.field_type === "textarea") {
    return <div><label className="mb-2 block text-sm font-bold text-slate-800">{field.field_label}{field.required ? " *" : ""}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-indigo-600" /></div>;
  }
  return <Input label={`${field.field_label}${field.required ? " *" : ""}`} type={field.field_type === "time" || field.field_type === "date" ? field.field_type : "text"} value={value} onChange={onChange} />;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><label className="mb-2 block text-sm font-bold text-slate-800">{label}</label><input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-indigo-600" /></div>;
}
