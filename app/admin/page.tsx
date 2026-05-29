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

  if (loading) {
    return <div className="p-10 text-xl font-bold">Loading Admin Dashboard...</div>;
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
          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
            <p className="text-sm font-bold text-slate-300">Total Users</p>
            <p className="mt-2 text-4xl font-extrabold">{profiles.length}</p>
          </div>

          <div className="rounded-2xl bg-blue-700 p-5 text-white shadow-lg">
            <p className="text-sm font-bold text-blue-100">Modules</p>
            <p className="mt-2 text-4xl font-extrabold">{modules.length}</p>
          </div>

          <div className="rounded-2xl bg-green-700 p-5 text-white shadow-lg">
            <p className="text-sm font-bold text-green-100">Video Records</p>
            <p className="mt-2 text-4xl font-extrabold">
              {progress.filter((p) => p.watched).length}
            </p>
          </div>

          <div className="rounded-2xl bg-purple-700 p-5 text-white shadow-lg">
            <p className="text-sm font-bold text-purple-100">Quiz Attempts</p>
            <p className="mt-2 text-4xl font-extrabold">
              {progress.filter((p) => p.quiz_attempted).length}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
          <h2 className="mb-6 text-3xl font-bold text-slate-950">
            Article / Employee Training Report
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-900 text-left text-white">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Video</th>
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {profiles
                  .filter((p) => {
                    const role = (p.role || "").toLowerCase();
                    return role.includes("article") || role.includes("employee");
                  })
                  .flatMap((person) =>
                    modules.map((module) => {
                      const item = getProgress(person.user_id, module.id);

                      return (
                        <tr
                          key={`${person.user_id}-${module.id}`}
                          className="border-b border-slate-200 bg-white text-slate-900"
                        >
                          <td className="px-4 py-3 font-bold">
                            {person.full_name || "-"}
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                              {person.role || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {module.display_order}. {module.title}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                item?.watched
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {item?.watched ? "Completed" : "Pending"}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                item?.quiz_attempted
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-200 text-slate-800"
                              }`}
                            >
                              {item?.quiz_attempted ? "Attempted" : "Pending"}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-bold text-blue-700">
                            {item?.marks || 0}%
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                item?.status === "Passed"
                                  ? "bg-green-100 text-green-800"
                                  : item?.status === "Failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-200 text-slate-800"
                              }`}
                            >
                              {item?.status || "Not Started"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}