"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Employee = {
  user_id: string;
  full_name: string | null;
  role: string | null;
  designation: string | null;
  official_email: string | null;
  personal_email: string | null;
  mobile_number: string | null;
  employment_status: string | null;
  active_for_assignment: boolean | null;
  joining_date: string | null;
  date_of_exit: string | null;
  exit_reason: string | null;
};

export default function EmployeeManagementPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.push("/login");
      return;
    }

    const { data: myProfile } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    const role = (myProfile?.role || "").toLowerCase();

    if (!role.includes("admin") && !role.includes("partner")) {
      router.push("/dashboard");
      return;
    }

    const { data, error } = await supabase
      .from("employee_profiles")
      .select(
        "user_id, full_name, role, designation, official_email, personal_email, mobile_number, employment_status, active_for_assignment, joining_date, date_of_exit, exit_reason"
      )
      .order("full_name", { ascending: true });

    if (error) {
      setMessage("Unable to load employees: " + error.message);
    }

    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const markPastEmployee = async (emp: Employee) => {
    const reason = window.prompt(
      `Reason for marking ${emp.full_name || "this employee"} as past employee?`
    );

    if (reason === null) return;

    const { error } = await supabase
      .from("employee_profiles")
      .update({
        employment_status: "Past Employee",
        active_for_assignment: false,
        date_of_exit: new Date().toISOString().slice(0, 10),
        exit_reason: reason || null,
      })
      .eq("user_id", emp.user_id);

    if (error) {
      setMessage("Could not mark past employee: " + error.message);
      return;
    }

    setMessage("Employee moved to past employee database.");
    await loadData();
  };

  const reactivateEmployee = async (emp: Employee) => {
    const { error } = await supabase
      .from("employee_profiles")
      .update({
        employment_status: "Active",
        active_for_assignment: true,
        date_of_exit: null,
        exit_reason: null,
      })
      .eq("user_id", emp.user_id);

    if (error) {
      setMessage("Could not reactivate employee: " + error.message);
      return;
    }

    setMessage("Employee reactivated.");
    await loadData();
  };

  const filteredEmployees = employees.filter((emp) => {
    const text = [
      emp.full_name,
      emp.role,
      emp.designation,
      emp.official_email,
      emp.personal_email,
      emp.mobile_number,
      emp.employment_status,
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const activeEmployees = filteredEmployees.filter(
    (e) => e.active_for_assignment !== false
  );

  const pastEmployees = filteredEmployees.filter(
    (e) => e.active_for_assignment === false
  );

  if (loading) {
    return (
      <div className="p-10 text-xl font-bold text-slate-900">
        Loading Employee Management...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 to-purple-950 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">
                Employee Management
              </h1>
              <p className="mt-2 text-purple-100">
                Active employees, past employees, roles and employee database.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/admin")}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900"
              >
                Admin Dashboard
              </button>

              <button
                onClick={() => router.push("/admin/laptops")}
                className="rounded-2xl bg-cyan-700 px-6 py-3 text-sm font-bold text-white"
              >
                Laptop Management
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl bg-blue-700 px-6 py-3 text-sm font-bold text-white"
              >
                Main Dashboard
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl bg-blue-50 p-4 font-bold text-blue-900 ring-1 ring-blue-200">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Summary title="Total Employees" value={employees.length} color="bg-slate-900" />
          <Summary title="Active" value={employees.filter((e) => e.active_for_assignment !== false).length} color="bg-green-700" />
          <Summary title="Past Employees" value={employees.filter((e) => e.active_for_assignment === false).length} color="bg-purple-700" />
          <Summary title="Articles" value={employees.filter((e) => (e.role || "").toLowerCase().includes("article")).length} color="bg-blue-700" />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-300">
          <label className="mb-2 block text-sm font-bold text-slate-800">
            Search Employees
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, mobile, role, designation..."
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <Section title="Active Employees">
          <EmployeeTable
            employees={activeEmployees}
            pastMode={false}
            onMarkPast={markPastEmployee}
            onReactivate={reactivateEmployee}
          />
        </Section>

        <Section title="Past Employees Database">
          <EmployeeTable
            employees={pastEmployees}
            pastMode={true}
            onMarkPast={markPastEmployee}
            onReactivate={reactivateEmployee}
          />
        </Section>
      </div>
    </div>
  );
}

function EmployeeTable({
  employees,
  pastMode,
  onMarkPast,
  onReactivate,
}: {
  employees: Employee[];
  pastMode: boolean;
  onMarkPast: (emp: Employee) => void;
  onReactivate: (emp: Employee) => void;
}) {
  if (employees.length === 0) {
    return <p className="text-slate-700">No employees found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-slate-300 text-sm">
        <thead>
          <tr className="bg-slate-900 text-left text-white">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Designation</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Mobile</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Joining</th>
            <th className="px-4 py-3">Exit</th>
            <th className="px-4 py-3">Exit Reason</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {employees.map((emp) => (
            <tr
              key={emp.user_id}
              className="border-b border-slate-200 bg-white text-slate-900"
            >
              <td className="px-4 py-3 font-bold">
                {emp.full_name || "-"}
              </td>

              <td className="px-4 py-3">
                {emp.role || "-"}
              </td>

              <td className="px-4 py-3">
                {emp.designation || "-"}
              </td>

              <td className="px-4 py-3">
                {emp.official_email || emp.personal_email || "-"}
              </td>

              <td className="px-4 py-3">
                {emp.mobile_number || "-"}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                    pastMode
                      ? "bg-purple-100 text-purple-900 ring-purple-300"
                      : "bg-green-100 text-green-900 ring-green-300"
                  }`}
                >
                  {emp.employment_status || "Active"}
                </span>
              </td>

              <td className="px-4 py-3">
                {emp.joining_date || "-"}
              </td>

              <td className="px-4 py-3">
                {emp.date_of_exit || "-"}
              </td>

              <td className="px-4 py-3">
                {emp.exit_reason || "-"}
              </td>

              <td className="px-4 py-3">
                {pastMode ? (
                  <button
                    onClick={() => onReactivate(emp)}
                    className="rounded-xl bg-green-700 px-4 py-2 text-xs font-bold text-white hover:bg-green-800"
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    onClick={() => onMarkPast(emp)}
                    className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
                  >
                    Mark Past
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Summary({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-5 text-white shadow-xl`}>
      <p className="text-sm font-bold text-white/80">{title}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
      <h2 className="mb-6 text-2xl font-bold text-slate-950">{title}</h2>
      {children}
    </div>
  );
}