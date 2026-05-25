"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const userId = userData.user.id;

      const { data: profileData } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      setProfile(profileData);

      const { data: modulesData } = await supabase
        .from("training_modules")
        .select("*")
        .order("display_order", { ascending: true });

      setModules(modulesData || []);

      const { data: progressData } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", userId);

      setProgress(progressData || []);

      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const getProgress = (moduleId: string) => {
    return progress.find((p) => p.module_id === moduleId);
  };

  if (loading) {
    return (
      <div className="p-10 text-xl font-bold text-slate-900">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="rounded-3xl bg-gradient-to-r from-blue-900 to-slate-900 p-8 text-white shadow-2xl">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h1 className="text-4xl font-extrabold tracking-tight">
                Welcome, {profile?.full_name || "Employee"}
              </h1>

              <p className="mt-3 text-lg text-blue-100">
                B V C & Co. Article / Employee Training Portal
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold">
                  SRO No: {profile?.sro_number || "-"}
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold">
                  Foundation: {profile?.foundation_marks || "-"}
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold">
                  IPCC G1: {profile?.ipcc_group1_marks || "-"}
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold">
                  IPCC G2: {profile?.ipcc_group2_marks || "-"}
                </div>

              </div>

            </div>

            <div className="flex flex-wrap gap-3">

              <button
                onClick={() => router.push("/profile")}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-105"
              >
                Profile
              </button>

              <button
                onClick={() => router.push("/training")}
                className="rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105"
              >
                Training Modules
              </button>

            </div>

          </div>

        </div>

        {/* TRAINING MODULES */}

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <h2 className="text-3xl font-bold text-slate-950">
                Training Modules
              </h2>

              <p className="mt-1 text-slate-500">
                Complete all mandatory onboarding modules
              </p>

            </div>

          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">

            {modules.map((module) => {
              const moduleProgress = getProgress(module.id);

              return (
                <div
                  key={module.id}
                  className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
                >

                  <div className="flex items-start justify-between">

                    <div>

                      <h3 className="text-2xl font-bold text-slate-950">
                        {module.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {module.description}
                      </p>

                    </div>

                    <div
                      className={`rounded-2xl px-4 py-2 text-xs font-bold ${
                        moduleProgress?.status === "Passed"
                          ? "bg-green-100 text-green-900"
                          : moduleProgress?.status === "Failed"
                          ? "bg-red-100 text-red-900"
                          : "bg-yellow-100 text-yellow-900"
                      }`}
                    >
                      {moduleProgress?.status || "Pending"}
                    </div>

                  </div>

                  <div className="mt-6 space-y-3">

                    <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">

                      <span className="font-semibold text-slate-700">
                        Video
                      </span>

                      <span
                        className={`font-bold ${
                          moduleProgress?.watched
                            ? "text-green-700"
                            : "text-yellow-700"
                        }`}
                      >
                        {moduleProgress?.watched
                          ? "Completed"
                          : "Pending"}
                      </span>

                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">

                      <span className="font-semibold text-slate-700">
                        Quiz Score
                      </span>

                      <span className="font-bold text-blue-700">
                        {moduleProgress?.marks || 0}%
                      </span>

                    </div>

                  </div>

                  <button
                    onClick={() => router.push(`/training/${module.id}`)}
                    className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Open Module
                  </button>

                </div>
              );
            })}

          </div>

        </div>

      </div>

    </div>
  );
}