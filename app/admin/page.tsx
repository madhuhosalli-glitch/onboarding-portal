"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "ca.madhuhegde@gmail.com";

type EmployeeProfile = {
  id: string;
  user_id: string;
  full_name: string;
  sro_number: string;
  foundation_marks: number | null;
  ipcc_group1_marks: number | null;
  ipcc_group2_marks: number | null;
  personal_email: string;
  mobile_number: string;
  status: string;
};

type TrainingProgress = {
  id: string;
  user_id: string;
  module_id: string;
  marks: number;
  status: string;
  quiz_attempted: boolean;
};

type EmployeeWithTraining = EmployeeProfile & {
  training: (TrainingProgress & { module_title?: string })[];
};

export default function AdminPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      if ((data.user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.push("/training");
        return;
      }

      const { data: profiles } = await supabase.from("employee_profiles").select("*").order("created_at", { ascending: false });
      const { data: progress } = await supabase.from("training_progress").select("*");
      const { data: modules } = await supabase.from("training_modules").select("id, title");

      const merged = (profiles || []).map((profile) => {
        const employeeTraining = (progress || [])
          .filter((p) => p.user_id === profile.user_id)
          .map((p) => {
            const module = (modules || []).find((m) => m.id === p.module_id);
            return { ...p, module_title: module?.title || "Unknown Module" };
          });

        return { ...profile, training: employeeTraining };
      });

      setEmployees(merged);
      setLoading(false);
    };

    init();
  }, [router]);

  const updateStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("employee_profiles").update({ status }).eq("user_id", userId);
    if (error) {
      setMessage("Error updating status: " + error.message);
      return;
    }
    setEmployees((prev) => prev.map((e) => (e.user_id === userId ? { ...e, status } : e)));
    setMessage(`Status updated to ${status}.`);
  };

  const total = employees.length;
  const training = employees.filter((e) => !e.status || e.status === "Training").length;
  const completed = employees.filter((e) => e.status === "Completed").length;
  const review = employees.filter((e) => e.status === "Under Review").length;
  const avgScore = (() => {
    const scores = employees.flatMap((e) => e.training.filter((t) => t.quiz_attempted).map((t) => t.marks || 0));
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  })();

  const getStatusBadge = (status?: string) => {
    if (status === "Completed") return "bg-green-100 text-green-900 border border-green-300";
    if (status === "Under Review") return "bg-amber-100 text-amber-900 border border-amber-300";
    return "bg-blue-100 text-blue-900 border border-blue-300";
  };

  const getTrainingBadge = (status?: string) => {
    if (status === "Passed") return "bg-green-100 text-green-900 border border-green-300";
    if (status === "Failed") return "bg-red-100 text-red-900 border border-red-300";
    return "bg-yellow-100 text-yellow-900 border border-yellow-300";
  };

  if (loading) {
    return <div className="p-10"><p className="text-lg font-semibold text-slate-900">Loading...</p></div>;
  }

  return (
    <div className="space-y-6 bg-slate-100 p-6">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
        <h1 className="text-3xl font-bold text-slate-950">Admin Training Dashboard</h1>
        <p className="mt-2 text-base font-medium text-slate-700">
          Review article / employee training profiles, quiz results and completion progress.
        </p>
        {message && <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 ring-1 ring-blue-200">{message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <SummaryCard title="Total" value={total} bg="bg-slate-900" />
        <SummaryCard title="Training" value={training} bg="bg-blue-700" />
        <SummaryCard title="Completed" value={completed} bg="bg-green-700" />
        <SummaryCard title="Review" value={review} bg="bg-amber-700" />
        <SummaryCard title="Avg Score" value={`${avgScore}%`} bg="bg-indigo-700" />
      </div>

      {employees.map((emp) => (
        <div key={emp.id || emp.user_id} className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-300 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{emp.full_name || "Unnamed"}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">SRO No: {emp.sro_number || "-"}</p>
            </div>
            <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${getStatusBadge(emp.status)}`}>
              {emp.status || "Training"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InfoCard label="Foundation Marks" value={emp.foundation_marks?.toString()} />
            <InfoCard label="IPCC / Inter Group 1" value={emp.ipcc_group1_marks?.toString()} />
            <InfoCard label="IPCC / Inter Group 2" value={emp.ipcc_group2_marks?.toString()} />
            <InfoCard label="Personal Email" value={emp.personal_email} />
            <InfoCard label="Mobile No." value={emp.mobile_number} />
            <InfoCard label="User ID" value={emp.user_id} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => updateStatus(emp.user_id, "Completed")} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800">Mark Completed</button>
            <button onClick={() => updateStatus(emp.user_id, "Under Review")} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800">Under Review</button>
            <button onClick={() => updateStatus(emp.user_id, "Training")} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">Training</button>
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-xl font-bold text-slate-950">Training Results</h3>
            {emp.training.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300"><p className="font-medium text-slate-700">No training attempted yet.</p></div>
            ) : (
              <div className="grid gap-3">
                {emp.training.map((tr) => (
                  <div key={tr.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-950">{tr.module_title}</p>
                        <p className="text-sm font-medium text-slate-700">Marks: {tr.marks}%</p>
                      </div>
                      <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${getTrainingBadge(tr.status)}`}>
                        {tr.status || "Not Started"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ title, value, bg }: { title: string; value: number | string; bg: string }) {
  return <div className={`${bg} rounded-xl p-4 shadow-lg`}><p className="text-sm font-bold text-white/90">{title}</p><p className="mt-1 text-3xl font-extrabold text-white">{value}</p></div>;
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300"><p className="text-sm font-bold text-slate-600">{label}</p><p className="mt-1 text-base font-semibold text-slate-950">{value || "-"}</p></div>;
}
