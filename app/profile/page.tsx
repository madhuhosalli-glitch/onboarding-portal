"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      setProfile(profileData);

      const { data: progressData } = await supabase
        .from("training_progress")
        .select(`
          *,
          training_modules (
            title,
            display_order
          )
        `)
        .eq("user_id", userData.user.id);

      setProgress(progressData || []);
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return <div className="p-10 text-xl font-bold">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-blue-900 to-slate-900 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">
                {profile?.full_name || "Profile"}
              </h1>
              <p className="mt-2 text-blue-100">
                Role: {profile?.role || "-"}
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

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <h2 className="mb-4 text-2xl font-bold text-slate-950">
              Personal Details
            </h2>

            <div className="space-y-4 text-slate-900">
              <div>
                <p className="text-sm font-bold text-slate-500">Full Name</p>
                <p className="text-lg font-semibold">{profile?.full_name || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Official Email</p>
                <p className="text-lg font-semibold">{profile?.official_email || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Personal Email</p>
                <p className="text-lg font-semibold">{profile?.personal_email || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Mobile Number</p>
                <p className="text-lg font-semibold">{profile?.mobile_number || "-"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <h2 className="mb-4 text-2xl font-bold text-slate-950">
              Article / Academic Details
            </h2>

            <div className="space-y-4 text-slate-900">
              <div>
                <p className="text-sm font-bold text-slate-500">SRO Number</p>
                <p className="text-lg font-semibold">{profile?.sro_number || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Foundation Marks</p>
                <p className="text-lg font-semibold">{profile?.foundation_marks || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">IPCC / Inter Group 1</p>
                <p className="text-lg font-semibold">{profile?.ipcc_group1_marks || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">IPCC / Inter Group 2</p>
                <p className="text-lg font-semibold">{profile?.ipcc_group2_marks || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
          <h2 className="mb-6 text-3xl font-bold text-slate-950">
            Training Progress
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-2xl border border-slate-300">
              <thead>
                <tr className="bg-slate-900 text-left text-white">
                  <th className="px-5 py-4">Module</th>
                  <th className="px-5 py-4">Video</th>
                  <th className="px-5 py-4">Quiz</th>
                  <th className="px-5 py-4">Marks</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {progress.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-5 text-center font-semibold text-slate-700"
                    >
                      No training progress available yet.
                    </td>
                  </tr>
                ) : (
                  progress.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-200 bg-white text-slate-900"
                    >
                      <td className="px-5 py-4 font-bold text-slate-950">
                        {item.training_modules?.display_order}.{" "}
                        {item.training_modules?.title}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            item.watched
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {item.watched ? "Completed" : "Pending"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            item.quiz_attempted
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {item.quiz_attempted ? "Attempted" : "Locked"}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold text-blue-700">
                        {item.marks || 0}%
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            item.status === "Passed"
                              ? "bg-green-100 text-green-800"
                              : item.status === "Failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {item.status || "Not Started"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}