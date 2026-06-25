"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);

  const [sopCategories, setSopCategories] = useState<any[]>([]);
  const [sops, setSops] = useState<any[]>([]);
  const [sopReadStatus, setSopReadStatus] = useState<any[]>([]);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"training" | "sops">("training");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: myProfile } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      const role = (myProfile?.role || "").toLowerCase();

      if (!role.includes("admin") && !role.includes("partner")) {
        router.push("/dashboard");
        return;
      }

      setProfile(myProfile);

      const { data: allProfiles } = await supabase
        .from("employee_profiles")
        .select("*")
        .order("full_name", { ascending: true });

      const { data: allModules } = await supabase
        .from("training_modules")
        .select("*")
        .order("display_order", { ascending: true });

      const { data: allProgress } = await supabase
        .from("training_progress")
        .select("*");

      const { data: allSopCategories } = await supabase
        .from("sop_categories")
        .select("*")
        .order("display_order", { ascending: true });

      const { data: allSops } = await supabase
        .from("sops")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });

      const { data: allSopReadStatus } = await supabase
        .from("sop_read_status")
        .select("*");

      setProfiles(allProfiles || []);
      setModules(allModules || []);
      setProgress(allProgress || []);
      setSopCategories(allSopCategories || []);
      setSops(allSops || []);
      setSopReadStatus(allSopReadStatus || []);
      setLoading(false);
    };

    loadAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const reportUsers = profiles.filter((p) => {
    const role = (p.role || "").toLowerCase();
    return role.includes("article") || role.includes("employee");
  });

  const activeEmployees = profiles.filter((p) => p.active_for_assignment !== false);
  const pastEmployees = profiles.filter((p) => p.active_for_assignment === false);

  const getTrainingProgress = (userId: string, moduleId: string) => {
    return progress.find(
      (p) => p.user_id === userId && p.module_id === moduleId
    );
  };

  const getUserTrainingProgress = (userId: string) => {
    return progress.filter((p) => p.user_id === userId);
  };

  const getTrainingSummary = (person: any) => {
    const userProgress = getUserTrainingProgress(person.user_id);

    const totalModules = modules.length;
    const videosCompleted = userProgress.filter((p) => p.watched).length;
    const quizzesAttempted = userProgress.filter((p) => p.quiz_attempted).length;
    const passed = userProgress.filter((p) => p.status === "Passed").length;

    const marksArray = userProgress
      .filter((p) => p.quiz_attempted)
      .map((p) => Number(p.marks || 0));

    const avgMarks =
      marksArray.length > 0
        ? Math.round(marksArray.reduce((a, b) => a + b, 0) / marksArray.length)
        : 0;

    const overallPercent =
      totalModules > 0 ? Math.round((passed / totalModules) * 100) : 0;

    let status = "Not Started";

    if (overallPercent === 100) status = "Completed";
    else if (videosCompleted > 0 || quizzesAttempted > 0) status = "In Progress";

    return {
      totalModules,
      videosCompleted,
      quizzesAttempted,
      passed,
      avgMarks,
      overallPercent,
      status,
    };
  };

  const isSopRead = (userId: string, sopId: string) => {
    return sopReadStatus.some((r) => r.user_id === userId && r.sop_id === sopId);
  };

  const getSopReadItem = (userId: string, sopId: string) => {
    return sopReadStatus.find((r) => r.user_id === userId && r.sop_id === sopId);
  };

  const getSopSummary = (person: any) => {
    const readCount = sopReadStatus.filter((r) => r.user_id === person.user_id).length;
    const totalSops = sops.length;
    const completionPercent =
      totalSops > 0 ? Math.round((readCount / totalSops) * 100) : 0;

    let status = "Not Started";

    if (completionPercent === 100) status = "Completed";
    else if (readCount > 0) status = "In Progress";

    return {
      readCount,
      totalSops,
      completionPercent,
      status,
    };
  };

  const totalUsers = reportUsers.length;

  const trainingCompletedUsers = reportUsers.filter(
    (p) => getTrainingSummary(p).overallPercent === 100
  ).length;

  const trainingInProgressUsers = reportUsers.filter(
    (p) => getTrainingSummary(p).status === "In Progress"
  ).length;

  const trainingNotStartedUsers = reportUsers.filter(
    (p) => getTrainingSummary(p).status === "Not Started"
  ).length;

  const sopCompletedUsers = reportUsers.filter(
    (p) => getSopSummary(p).completionPercent === 100
  ).length;

  const sopInProgressUsers = reportUsers.filter(
    (p) => getSopSummary(p).status === "In Progress"
  ).length;

  const sopNotStartedUsers = reportUsers.filter(
    (p) => getSopSummary(p).status === "Not Started"
  ).length;

  if (loading) {
    return (
      <div className="p-10 text-xl font-bold text-slate-900">
        Loading Admin Dashboard...
      </div>
    );
  }

  if (selectedUser && activeTab === "training") {
    const summary = getTrainingSummary(selectedUser);

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Header
            title={selectedUser.full_name || "User"}
            subtitle="Module-wise Training Report"
            detail={`Role: ${selectedUser.role || "-"} | Overall Completion: ${summary.overallPercent}%`}
            onBack={() => setSelectedUser(null)}
            onDashboard={() => router.push("/dashboard")}
            onLogout={handleLogout}
          />

          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard title="Video Completed" value={`${summary.videosCompleted}/${modules.length}`} color="bg-green-700" />
            <SummaryCard title="Quiz Attempted" value={`${summary.quizzesAttempted}/${modules.length}`} color="bg-blue-700" />
            <SummaryCard title="Passed Modules" value={`${summary.passed}/${modules.length}`} color="bg-purple-700" />
            <SummaryCard title="Average Marks" value={`${summary.avgMarks}%`} color="bg-slate-900" />
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="mb-6 text-3xl font-bold text-slate-950">
              Module-wise Details
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-slate-300 text-sm">
                <thead>
                  <tr className="bg-slate-900 text-left text-white">
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Video</th>
                    <th className="px-4 py-3">Quiz</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {modules.map((module) => {
                    const item = getTrainingProgress(selectedUser.user_id, module.id);

                    return (
                      <tr key={module.id} className="border-b border-slate-200 bg-white text-slate-900">
                        <td className="px-4 py-3 font-bold">
                          {module.display_order}. {module.title}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            text={item?.watched ? "Completed" : "Pending"}
                            color={item?.watched ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            text={item?.quiz_attempted ? "Attempted" : "Pending"}
                            color={item?.quiz_attempted ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-800"}
                          />
                        </td>

                        <td className="px-4 py-3 font-bold text-blue-700">
                          {item?.marks || 0}%
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            text={item?.status || "Not Started"}
                            color={
                              item?.status === "Passed"
                                ? "bg-green-100 text-green-800"
                                : item?.status === "Failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-200 text-slate-800"
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedUser && activeTab === "sops") {
    const summary = getSopSummary(selectedUser);

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Header
            title={selectedUser.full_name || "User"}
            subtitle="SOP-wise Reading Report"
            detail={`Role: ${selectedUser.role || "-"} | SOP Completion: ${summary.completionPercent}%`}
            onBack={() => setSelectedUser(null)}
            onDashboard={() => router.push("/dashboard")}
            onLogout={handleLogout}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title="SOPs Read" value={`${summary.readCount}/${sops.length}`} color="bg-green-700" />
            <SummaryCard title="Completion" value={`${summary.completionPercent}%`} color="bg-indigo-700" />
            <SummaryCard title="Status" value={summary.status} color="bg-slate-900" />
          </div>

          {sopCategories.map((category) => {
            const categorySops = sops.filter((s) => s.category_id === category.id);
            const categoryRead = categorySops.filter((s) =>
              isSopRead(selectedUser.user_id, s.id)
            ).length;

            const categoryPercent =
              categorySops.length > 0
                ? Math.round((categoryRead / categorySops.length) * 100)
                : 0;

            return (
              <div key={category.id} className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-950">
                      {category.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {categoryRead}/{categorySops.length} SOPs read
                    </p>
                  </div>

                  <ProgressBar percent={categoryPercent} />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-slate-300 text-sm">
                    <thead>
                      <tr className="bg-slate-900 text-left text-white">
                        <th className="px-4 py-3">SOP</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Read Status</th>
                        <th className="px-4 py-3">Read Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {categorySops.map((sop) => {
                        const readItem = getSopReadItem(selectedUser.user_id, sop.id);

                        return (
                          <tr key={sop.id} className="border-b border-slate-200 bg-white text-slate-900">
                            <td className="px-4 py-3 font-bold">
                              {sop.display_order}. {sop.title}
                            </td>

                            <td className="px-4 py-3 text-slate-700">
                              {sop.description || "-"}
                            </td>

                            <td className="px-4 py-3">
                              <Badge
                                text={readItem ? "Read" : "Pending"}
                                color={readItem ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                              />
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {readItem?.read_at
                                ? new Date(readItem.read_at).toLocaleString()
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-purple-900 via-slate-900 to-blue-900 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-purple-100">
                Welcome, {profile?.full_name || "Admin / Partner"}
              </p>
              <p className="mt-2 text-sm text-purple-200">
                Manage employee records, training, SOPs, laptops and internal systems.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
              >
                ← Back to Main Portal
              </button>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Total Users" value={totalUsers} color="bg-slate-900" />
          <SummaryCard title="Active Employees" value={activeEmployees.length} color="bg-green-700" />
          <SummaryCard title="Past Employees" value={pastEmployees.length} color="bg-purple-700" />
          <SummaryCard title="Training Completed" value={trainingCompletedUsers} color="bg-blue-700" />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <NavigationCard
            title="Employee Management"
            description="Manage active employees, past employees and employee database."
            button="Open Employees"
            color="from-emerald-700 to-slate-900"
            onClick={() => router.push("/admin/employees")}
          />

          <NavigationCard
            title="Laptop Management"
            description="Manage laptops, assignments, transfers and complaints."
            button="Open Laptops"
            color="from-cyan-700 to-slate-900"
            onClick={() => router.push("/admin/laptops")}
          />
          <NavigationCard
            title="SOP Compliance"
            description="Assign SOPs to administrators, complete compliance checklists, review exceptions and monitor adherence."
            button="Open SOP Compliance"
            color="from-indigo-700 to-slate-900"
            onClick={() => router.push("/admin/sop-compliance")}
          />

          <NavigationCard
            title="Main Dashboard"
            description="Go back to your personal dashboard and portal shortcuts."
            button="Open Dashboard"
            color="from-blue-700 to-slate-900"
            onClick={() => router.push("/dashboard")}
          />
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setActiveTab("training");
                setSelectedUser(null);
              }}
              className={`rounded-2xl px-6 py-3 text-sm font-bold ${
                activeTab === "training"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              Training Dashboard
            </button>

            <button
              onClick={() => {
                setActiveTab("sops");
                setSelectedUser(null);
              }}
              className={`rounded-2xl px-6 py-3 text-sm font-bold ${
                activeTab === "sops"
                  ? "bg-indigo-700 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              SOP Dashboard
            </button>
          </div>
        </div>

        {activeTab === "training" ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard title="Total Users" value={totalUsers} color="bg-slate-900" />
              <SummaryCard title="Completed" value={trainingCompletedUsers} color="bg-green-700" />
              <SummaryCard title="In Progress" value={trainingInProgressUsers} color="bg-blue-700" />
              <SummaryCard title="Not Started" value={trainingNotStartedUsers} color="bg-yellow-600" />
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
              <h2 className="mb-6 text-3xl font-bold text-slate-950">
                User-wise Training Summary
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-slate-300 text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-left text-white">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Videos</th>
                      <th className="px-4 py-3">Quizzes</th>
                      <th className="px-4 py-3">Avg Marks</th>
                      <th className="px-4 py-3">Overall %</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportUsers.map((person) => {
                      const summary = getTrainingSummary(person);

                      return (
                        <tr key={person.user_id} className="border-b border-slate-200 bg-white text-slate-900">
                          <td className="px-4 py-3 font-bold">
                            {person.full_name || "-"}
                          </td>

                          <td className="px-4 py-3">
                            <Badge text={person.role || "-"} color="bg-slate-200 text-slate-800" />
                          </td>

                          <td className="px-4 py-3 font-bold text-green-700">
                            {summary.videosCompleted}/{modules.length}
                          </td>

                          <td className="px-4 py-3 font-bold text-blue-700">
                            {summary.quizzesAttempted}/{modules.length}
                          </td>

                          <td className="px-4 py-3 font-bold text-indigo-700">
                            {summary.avgMarks}%
                          </td>

                          <td className="px-4 py-3">
                            <ProgressBar percent={summary.overallPercent} />
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              text={summary.status}
                              color={
                                summary.status === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : summary.status === "In Progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            />
                          </td>

                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedUser(person)}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard title="Total Users" value={totalUsers} color="bg-slate-900" />
              <SummaryCard title="Completed" value={sopCompletedUsers} color="bg-green-700" />
              <SummaryCard title="In Progress" value={sopInProgressUsers} color="bg-indigo-700" />
              <SummaryCard title="Not Started" value={sopNotStartedUsers} color="bg-yellow-600" />
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
              <h2 className="mb-6 text-3xl font-bold text-slate-950">
                User-wise SOP Reading Summary
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-slate-300 text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-left text-white">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">SOPs Read</th>
                      <th className="px-4 py-3">Total SOPs</th>
                      <th className="px-4 py-3">Completion %</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportUsers.map((person) => {
                      const summary = getSopSummary(person);

                      return (
                        <tr key={person.user_id} className="border-b border-slate-200 bg-white text-slate-900">
                          <td className="px-4 py-3 font-bold">
                            {person.full_name || "-"}
                          </td>

                          <td className="px-4 py-3">
                            <Badge text={person.role || "-"} color="bg-slate-200 text-slate-800" />
                          </td>

                          <td className="px-4 py-3 font-bold text-green-700">
                            {summary.readCount}
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-800">
                            {summary.totalSops}
                          </td>

                          <td className="px-4 py-3">
                            <ProgressBar percent={summary.completionPercent} />
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              text={summary.status}
                              color={
                                summary.status === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : summary.status === "In Progress"
                                  ? "bg-indigo-100 text-indigo-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            />
                          </td>

                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedUser(person)}
                              className="rounded-xl bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800"
                            >
                              View SOP Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NavigationCard({
  title,
  description,
  button,
  color,
  onClick,
}: {
  title: string;
  description: string;
  button: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${color} p-6 text-white shadow-xl`}>
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 min-h-12 text-sm text-white/80">{description}</p>
      <button
        onClick={onClick}
        className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
      >
        {button}
      </button>
    </div>
  );
}

function Header({
  title,
  subtitle,
  detail,
  onBack,
  onDashboard,
  onLogout,
}: {
  title: string;
  subtitle: string;
  detail: string;
  onBack: () => void;
  onDashboard: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-purple-900 via-slate-900 to-blue-900 p-8 text-white shadow-2xl">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold">{title}</h1>
          <p className="mt-2 text-purple-100">{subtitle}</p>
          <p className="mt-2 text-sm text-purple-200">{detail}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onBack}
            className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900"
          >
            ← Back
          </button>

          <button
            onClick={onDashboard}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white"
          >
            Dashboard
          </button>

          <button
            onClick={onLogout}
            className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-5 text-white shadow-lg`}>
      <p className="text-sm font-bold text-white/80">{title}</p>
      <p className="mt-2 text-4xl font-extrabold">{value}</p>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>
      {text}
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div>
      <div className="h-3 w-32 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            percent === 100
              ? "bg-green-600"
              : percent > 0
              ? "bg-indigo-600"
              : "bg-yellow-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-1 text-xs font-bold text-slate-700">
        {percent}%
      </p>
    </div>
  );
}