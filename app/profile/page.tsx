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
            title
          )
        `)
        .eq("user_id", userData.user.id);

      setProgress(progressData || []);

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  if (loading) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">

          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              ← Back
            </button>
          </div>

          <h1 className="text-3xl font-bold text-slate-950">
            {profile?.full_name || "Employee Profile"}
          </h1>

          <p className="mt-2 text-slate-600">
            Article / Employee Training Dashboard
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
            <h2 className="mb-4 text-xl font-bold text-slate-950">
              Personal Details
            </h2>

            <div className="space-y-3 text-sm">

              <div>
                <p className="font-semibold text-slate-500">Full Name</p>
                <p className="text-slate-900">
                  {profile?.full_name || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">Personal Email</p>
                <p className="text-slate-900">
                  {profile?.personal_email || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">Mobile Number</p>
                <p className="text-slate-900">
                  {profile?.mobile_number || "-"}
                </p>
              </div>

            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
            <h2 className="mb-4 text-xl font-bold text-slate-950">
              Academic Details
            </h2>

            <div className="space-y-3 text-sm">

              <div>
                <p className="font-semibold text-slate-500">SRO Number</p>
                <p className="text-slate-900">
                  {profile?.sro_number || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Foundation Marks
                </p>
                <p className="text-slate-900">
                  {profile?.foundation_marks || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  IPCC Group 1 Marks
                </p>
                <p className="text-slate-900">
                  {profile?.ipcc_group1_marks || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  IPCC Group 2 Marks
                </p>
                <p className="text-slate-900">
                  {profile?.ipcc_group2_marks || "-"}
                </p>
              </div>

            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">

          <h2 className="mb-4 text-xl font-bold text-slate-950">
            Training Progress
          </h2>

          <div className="overflow-x-auto">

            <table className="min-w-full border-collapse overflow-hidden rounded-xl">

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

                {progress.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-200 bg-white"
                  >
                    <td className="px-4 py-3">
                      {item.training_modules?.title}
                    </td>

                    <td className="px-4 py-3">
                      {item.watched ? "Completed" : "Pending"}
                    </td>

                    <td className="px-4 py-3">
                      {item.quiz_attempted ? "Attempted" : "Locked"}
                    </td>

                    <td className="px-4 py-3">
                      {item.marks || 0}%
                    </td>

                    <td className="px-4 py-3">
                      {item.status || "-"}
                    </td>
                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        </div>
      </div>
    </div>
  );
}