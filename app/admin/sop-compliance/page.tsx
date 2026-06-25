"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ModuleRow = { id: string; name: string; display_order: number };
type ChecklistRow = { id: string; module_id: string; name: string; frequency: string; display_order: number; active: boolean };
type Profile = { user_id: string; full_name: string | null; official_email: string | null; personal_email: string | null; role: string | null };
type Assignment = { id: string; checklist_id: string; employee_user_id: string; active: boolean };
type Submission = {
  id: string;
  checklist_id: string;
  status: string;
  submission_date: string | null;
  period_label: string | null;
  period_start: string | null;
  period_end: string | null;
  submitted_by_name: string | null;
  submitted_at: string | null;
  created_at: string; 
};
type SopItem = {
  id: string;
  checklist_id: string;
  item_text: string;
  display_order: number;
};

export default function SopCompliancePage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [items, setItems] = useState<SopItem[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [assignChecklist, setAssignChecklist] = useState<ChecklistRow | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [sopChecklist, setSopChecklist] = useState<ChecklistRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }
    setMyUserId(auth.user.id);

    const { data: myProfile } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("user_id", auth.user.id)
      .single();

    const role = (myProfile?.role || "").toLowerCase();
    if (!role.includes("admin") && !role.includes("partner")) {
      router.push("/dashboard");
      return;
    }

    const [{ data: mods }, { data: cls }, { data: profs }, { data: assigns }, { data: subs }, { data: sopItems }] = await Promise.all([
      supabase.from("operation_modules").select("*").order("display_order"),
      supabase.from("operation_checklists").select("*").eq("active", true).order("display_order"),
      supabase.from("employee_profiles").select("user_id, full_name, official_email, personal_email, role").order("full_name"),
      supabase.from("operation_assignments").select("*").eq("active", true),
      supabase.from("operation_submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("operation_sop_items").select("*").order("display_order"),
    ]);

    setModules(mods || []);
    setChecklists(cls || []);
    setProfiles(profs || []);
    setAssignments(assigns || []);
    setSubmissions(subs || []);
    setItems(sopItems || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAssignedNames = (checklistId: string) => {
    const ids = assignments.filter((a) => a.checklist_id === checklistId).map((a) => a.employee_user_id);
    if (ids.length === 0) return "Not assigned";
    return ids
      .map((id) => {
        const p = profiles.find((x) => x.user_id === id);
        return p?.full_name || p?.official_email || p?.personal_email || "User";
      })
      .join(", ");
  };

  const getLastSubmission = (checklistId: string) => submissions.find((s) => s.checklist_id === checklistId);

  const getSopItems = (checklistId: string) => items.filter((i) => i.checklist_id === checklistId);

  const filteredChecklists = useMemo(() => {
    return checklists.filter((c) => {
      const assignedToMe = assignments.some((a) => a.checklist_id === c.id && a.employee_user_id === myUserId);
      if (viewMode === "mine" && !assignedToMe) return false;
      const moduleName = modules.find((m) => m.id === c.module_id)?.name || "";
      const text = `${moduleName} ${c.name} ${c.frequency} ${getAssignedNames(c.id)}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [checklists, modules, assignments, profiles, search, viewMode, myUserId]);

  const openAssign = (checklist: ChecklistRow) => {
    const current: Record<string, boolean> = {};
    assignments
      .filter((a) => a.checklist_id === checklist.id)
      .forEach((a) => (current[a.employee_user_id] = true));
    setSelectedUsers(current);
    setAssignChecklist(checklist);
  };

  const saveAssignments = async () => {
    if (!assignChecklist) return;
    setMessage("");
    await supabase.from("operation_assignments").update({ active: false }).eq("checklist_id", assignChecklist.id);
    const rows = Object.entries(selectedUsers)
      .filter(([, checked]) => checked)
      .map(([userId]) => ({ checklist_id: assignChecklist.id, employee_user_id: userId, active: true }));
    if (rows.length > 0) {
      const { error } = await supabase.from("operation_assignments").insert(rows);
      if (error) {
        setMessage("Assignment failed: " + error.message);
        return;
      }
    }
    setMessage("Checklist assigned successfully.");
    setAssignChecklist(null);
    await loadData();
  };

  const formatDateTime = (date?: string | null) => (date ? new Date(date).toLocaleString("en-GB") : "-");

  const getFrequencyClass = (frequency: string) => {
    if (frequency === "Daily") return "border-l-green-600 bg-green-50";
    if (frequency === "Weekly") return "border-l-blue-600 bg-blue-50";
    if (frequency === "Monthly") return "border-l-purple-600 bg-purple-50";
    return "border-l-orange-600 bg-orange-50";
  };

  const completedToday = submissions.filter((s) => s.submission_date === new Date().toISOString().slice(0, 10)).length;
  const assignedToMe = assignments.filter((a) => a.employee_user_id === myUserId).length;

  if (loading) return <div className="p-10 text-xl font-bold text-slate-900">Loading SOP Compliance...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-950 to-purple-950 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">SOP Compliance</h1>
              <p className="mt-2 text-indigo-100">Assign SOP checklists, submit ready-made forms, view SOP items and track compliance.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push("/admin")} className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900">Admin Dashboard</button>
              <button onClick={() => router.push("/dashboard")} className="rounded-2xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white">Main Dashboard</button>
            </div>
          </div>
        </div>

        {message && <div className="rounded-2xl bg-blue-50 p-4 font-bold text-blue-900 ring-1 ring-blue-200">{message}</div>}

        <div className="grid gap-4 md:grid-cols-4">
          <Summary title="Total Checklists" value={checklists.length} color="bg-slate-900" />
          <Summary title="Assigned To Me" value={assignedToMe} color="bg-indigo-700" />
          <Summary title="Completed Today" value={completedToday} color="bg-green-700" />
          <Summary title="Submissions" value={submissions.length} color="bg-purple-700" />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOP, module, assignee..." className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-950 outline-none focus:border-indigo-600" />
            <button onClick={() => setViewMode("all")} className={`rounded-2xl px-5 py-3 font-bold ${viewMode === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}>All Checklists</button>
            <button onClick={() => setViewMode("mine")} className={`rounded-2xl px-5 py-3 font-bold ${viewMode === "mine" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-800"}`}>Assigned To Me</button>
          </div>
        </div>

        {modules.map((module) => {
          const moduleChecklists = filteredChecklists.filter((c) => c.module_id === module.id);
          if (moduleChecklists.length === 0) return null;
          return (
            <section key={module.id} className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
              <h2 className="mb-6 text-3xl font-extrabold text-slate-950">{module.name}</h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {moduleChecklists.map((checklist) => {
                  const last = getLastSubmission(checklist.id);
                  return (
                    <div key={checklist.id} className={`group rounded-3xl border-l-8 p-5 shadow-md ring-1 ring-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${getFrequencyClass(checklist.frequency)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-950">{checklist.name}</h3>
                          <p className="mt-1 text-sm font-bold text-slate-600">{checklist.frequency}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-300">{last ? "Submitted" : "Pending"}</span>
                      </div>
                      <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
                        <p>Assigned: {getAssignedNames(checklist.id)}</p>
                        <p>Last period: {last?.period_label || "-"}</p>
                        <p>Submitted: {formatDateTime(last?.submitted_at || last?.created_at)}</p>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <CardButton label="Open Checklist" color="bg-indigo-700" onClick={() => router.push(`/admin/sop-compliance/${checklist.id}`)} />
                        <CardButton label="View SOP Items" color="bg-slate-900" onClick={() => setSopChecklist(checklist)} />
                        <CardButton label="Assign" color="bg-green-700" onClick={() => openAssign(checklist)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {assignChecklist && (
        <Modal title={`Assign - ${assignChecklist.name}`} onClose={() => setAssignChecklist(null)}>
          <div className="space-y-3">
            {profiles.map((p) => (
              <label key={p.user_id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold text-slate-900 ring-1 ring-slate-200">
                <input type="checkbox" checked={!!selectedUsers[p.user_id]} onChange={(e) => setSelectedUsers({ ...selectedUsers, [p.user_id]: e.target.checked })} className="h-5 w-5" />
                <span>{p.full_name || p.official_email || p.personal_email || "Unnamed"} <span className="text-slate-500">({p.role || "User"})</span></span>
              </label>
            ))}
          </div>
          <button onClick={saveAssignments} className="mt-6 rounded-2xl bg-green-700 px-6 py-3 font-bold text-white">Save Assignment</button>
        </Modal>
      )}

      {sopChecklist && (
        <Modal title={`SOP Items - ${sopChecklist.name}`} onClose={() => setSopChecklist(null)}>
          <div className="grid gap-3">
            {getSopItems(sopChecklist.id).map((item, index) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="font-bold text-slate-900">{index + 1}. {item.item_text}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Summary({ title, value, color }: { title: string; value: string | number; color: string }) {
  return <div className={`${color} rounded-2xl p-5 text-white shadow-xl`}><p className="text-sm font-bold text-white/80">{title}</p><p className="mt-2 text-3xl font-extrabold">{value}</p></div>;
}

function CardButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return <button onClick={onClick} className={`${color} rounded-xl px-4 py-2 text-xs font-bold text-white hover:opacity-90`}>{label}</button>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-8 shadow-2xl"><div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-2xl font-extrabold text-slate-950">{title}</h2><button onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Close</button></div>{children}</div></div>;
}
