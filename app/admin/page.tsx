"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type EmployeeProfile = {
  id: string;
  user_id: string;
  full_name: string;
  pan: string;
  aadhaar: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  joining_date: string;
  status: string;
};

type EmployeeDocument = {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
};

type TrainingProgress = {
  id: string;
  user_id: string;
  module_id: string;
  marks: number;
  status: string;
  quiz_attempted: boolean;
};

type TrainingModule = {
  id: string;
  title: string;
};

type EmployeeWithDocs = EmployeeProfile & {
  documents: EmployeeDocument[];
  training: (TrainingProgress & { module_title?: string })[];
};

const ADMIN_EMAIL = "ca.madhuhegde@gmail.com";

export default function AdminPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<EmployeeWithDocs[]>([]);
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
        router.push("/dashboard");
        return;
      }

      const { data: profiles } = await supabase
        .from("employee_profiles")
        .select("*");

      const { data: docs } = await supabase
        .from("employee_documents")
        .select("*");

      const { data: progress } = await supabase
        .from("training_progress")
        .select("*");

      const { data: modules } = await supabase
        .from("training_modules")
        .select("id, title");

      const merged = (profiles || []).map((profile) => {
        const employeeTraining = (progress || [])
          .filter((p) => p.user_id === profile.user_id)
          .map((p) => {
            const module = (modules || []).find((m) => m.id === p.module_id);
            return {
              ...p,
              module_title: module?.title || "Unknown Module",
            };
          });

        return {
          ...profile,
          documents: (docs || []).filter((d) => d.user_id === profile.user_id),
          training: employeeTraining,
        };
      });

      setEmployees(merged);
      setLoading(false);
    };

    init();
  }, [router]);

  const updateStatus = async (userId: string, status: string) => {
    const { error } = await supabase
      .from("employee_profiles")
      .update({ status })
      .eq("user_id", userId);

    if (error) {
      setMessage("Error updating status: " + error.message);
      return;
    }

    setEmployees((prev) =>
      prev.map((e) => (e.user_id === userId ? { ...e, status } : e))
    );

    setMessage(`Status updated to ${status}.`);
  };

  const handleViewDocument = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("employee-documents")
      .download(filePath);

    if (error || !data) {
      setMessage("Unable to open file.");
      return;
    }

    const url = URL.createObjectURL(data);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const total = employees.length;
  const pending = employees.filter((e) => !e.status || e.status === "Pending").length;
  const approved = employees.filter((e) => e.status === "Approved").length;
  const rejected = employees.filter((e) => e.status === "Rejected").length;
  const review = employees.filter((e) => e.status === "Under Review").length;

  const getStatusBadge = (status?: string) => {
    if (status === "Approved") return "bg-green-100 text-green-900 border border-green-300";
    if (status === "Rejected") return "bg-red-100 text-red-900 border border-red-300";
    if (status === "Under Review") return "bg-amber-100 text-amber-900 border border-amber-300";
    return "bg-yellow-100 text-yellow-900 border border-yellow-300";
  };

  const getTrainingBadge = (status?: string) => {
    if (status === "Passed") return "bg-green-100 text-green-900 border border-green-300";
    if (status === "Failed") return "bg-red-100 text-red-900 border border-red-300";
    return "bg-yellow-100 text-yellow-900 border border-yellow-300";
  };

  const getDocLabel = (docType: string) => {
    if (docType === "pan_copy") return "PAN Copy";
    if (docType === "aadhaar_copy") return "Aadhaar Copy";
    if (docType === "photo") return "Photo";
    return docType;
  };

  if (loading) {
    return (
      <div className="p-10">
        <p className="text-lg font-semibold text-slate-900">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-100 p-6">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
        <h1 className="text-3xl font-bold text-slate-950">Admin Dashboard</h1>
        <p className="mt-2 text-base font-medium text-slate-700">
          Review employee onboarding, documents and training results.
        </p>

        {message && (
          <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 ring-1 ring-blue-200">
            {message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <SummaryCard title="Total" value={total} bg="bg-slate-900" />
        <SummaryCard title="Pending" value={pending} bg="bg-yellow-600" />
        <SummaryCard title="Approved" value={approved} bg="bg-green-700" />
        <SummaryCard title="Rejected" value={rejected} bg="bg-red-700" />
        <SummaryCard title="Review" value={review} bg="bg-amber-700" />
      </div>

      {employees.map((emp) => (
        <div
          key={emp.id}
          className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300"
        >
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-300 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                {emp.full_name || "Unnamed Employee"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                User ID: {emp.user_id}
              </p>
            </div>

            <span
              className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${getStatusBadge(
                emp.status
              )}`}
            >
              {emp.status || "Pending"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InfoCard label="PAN" value={emp.pan} />
            <InfoCard label="Aadhaar" value={emp.aadhaar} />
            <InfoCard label="Bank Name" value={emp.bank_name} />
            <InfoCard label="Account Number" value={emp.account_number} />
            <InfoCard label="IFSC Code" value={emp.ifsc_code} />
            <InfoCard label="Joining Date" value={emp.joining_date} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => updateStatus(emp.user_id, "Approved")}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
            >
              Approve
            </button>
            <button
              onClick={() => updateStatus(emp.user_id, "Rejected")}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
            >
              Reject
            </button>
            <button
              onClick={() => updateStatus(emp.user_id, "Under Review")}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800"
            >
              Under Review
            </button>
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-xl font-bold text-slate-950">Documents</h3>

            {emp.documents.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300">
                <p className="font-medium text-slate-700">No documents uploaded</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {emp.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-bold text-slate-950">
                        {getDocLabel(doc.document_type)}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {doc.file_name}
                      </p>
                    </div>

                    <button
                      onClick={() => handleViewDocument(doc.file_path)}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      Open File
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-xl font-bold text-slate-950">
              Training Results
            </h3>

            {emp.training.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300">
                <p className="font-medium text-slate-700">
                  No training attempted yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {emp.training.map((tr) => (
                  <div
                    key={tr.id}
                    className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-950">
                          {tr.module_title}
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          Marks: {tr.marks}%
                        </p>
                      </div>

                      <span
                        className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${getTrainingBadge(
                          tr.status
                        )}`}
                      >
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

function SummaryCard({
  title,
  value,
  bg,
}: {
  title: string;
  value: number;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 shadow-lg`}>
      <p className="text-sm font-bold text-white/90">{title}</p>
      <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">
        {value || "-"}
      </p>
    </div>
  );
}
