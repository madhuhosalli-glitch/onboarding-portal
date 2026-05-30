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
  const [selectedUser, setSelectedUser] = useState<any>(null);
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

      setProfiles(allProfiles || []);
      setModules(allModules || []);
      setProgress(allProgress || []);
      setLoading(false);
    };

    loadAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getProgress = (userId: string, moduleId: string) => {
    return progress.find(
      (p) => p.user_id === userId && p.module_id === moduleId
    );
  };

  const getUserProgress = (userId: string) => {
    return progress.filter((p) => p.user_id === userId);
  };

  const getSummary = (person: any) => {
    const userProgress = getUserProgress(person.user_id);

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

  const reportUsers = profiles.filter((p) => {
    const role = (p.role || "").toLowerCase();
    return role.includes("article") || role.includes("employee");
  });

  const totalUsers = reportUsers.length;
  const completedUsers = reportUsers.filter(
    (p) => getSummary(p).overallPercent === 100
  ).length;
  const inProgressUsers = reportUsers.filter(
    (p) => getSummary(p).status === "In Progress"
  ).length;
  const notStartedUsers = reportUsers.filter(
    (p) => getSummary(p).status === "Not Started"
  ).length;

  if (loading) {
    return (
      <div className="p-10 text-xl font-bold">
        Loading Admin Dashboard...
      </div>
    );
  }

  if (selectedUser) {
    const summary = getSummary(selectedUser);

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-purple-900 via-slate-900 to-blue-900 p-8 text-white shadow-2xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-4xl font-extrabold">
                  {selectedUser.full_name}
                </h1>
                <p className="mt-2 text-purple-100">
                  Module-wise Training Report
                </p>
                <p className="mt-2 text-sm text-purple-200">
                  Role: {selectedUser.role || "-"} | Overall Completion:{" "}
                  {summary.overallPercent}%
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900"
                >
                  ← Back to Users
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

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
                    const item = getProgress(selectedUser.user_id, module.id);

                    return (
                      <tr
                        key={module.id}
                        className="border-b border-slate-200 bg-white text-slate-900"
                      >
                        <td className="px-4 py-3 font-bold">
                          {module.display_order}. {module.title}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            text={item?.watched ? "Completed" : "Pending"}
                            color={
                              item?.watched
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          />
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            text={item?.quiz_attempted ? "Attempted" : "Pending"}
                            color={
                              item?.quiz_attempted
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-200 text-slate-800"
                            }
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
                First screen shows user-wise overall progress. Click any user to view module-wise details.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900"
              >
                Dashboard
              </button>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Total Users" value={totalUsers} color="bg-slate-900" />
          <SummaryCard title="Completed" value={completedUsers} color="bg-green-700" />
          <SummaryCard title="In Progress" value={inProgressUsers} color="bg-blue-700" />
          <SummaryCard title="Not Started" value={notStartedUsers} color="bg-yellow-600" />
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
                  const summary = getSummary(person);

                  return (
                    <tr
                      key={person.user_id}
                      className="border-b border-slate-200 bg-white text-slate-900"
                    >
                      <td className="px-4 py-3 font-bold">
                        {person.full_name || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          text={person.role || "-"}
                          color="bg-slate-200 text-slate-800"
                        />
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
                        <div className="h-3 w-32 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              summary.overallPercent === 100
                                ? "bg-green-600"
                                : summary.overallPercent > 0
                                ? "bg-blue-600"
                                : "bg-yellow-500"
                            }`}
                            style={{ width: `${summary.overallPercent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-bold text-slate-700">
                          {summary.overallPercent}%
                        </p>
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