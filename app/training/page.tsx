"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type TrainingModule = {
  id: string;
  title: string;
  description: string;
  progress?: {
  status: string;
  marks: number;
  quiz_attempted: boolean;
} | null;
};

export default function TrainingPage() {
  const router = useRouter();

  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModules = async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const user = userData.user;

      const { data: modulesData, error: modulesError } = await supabase
        .from("training_modules")
        .select("*")
        .order("created_at", { ascending: true });

      if (modulesError) {
        console.error(modulesError);
        setLoading(false);
        return;
      }

      const { data: progressData, error: progressError } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", user.id);

      if (progressError) {
        console.error(progressError);
      }

      const merged = (modulesData || []).map((mod) => {
        const progress = (progressData || []).find(
          (p) => p.module_id === mod.id
        );

        return {
          ...mod,
          progress: progress || null,
        };
      });

      setModules(merged);
      setLoading(false);
    };

    loadModules();
  }, [router]);

  const getStatusStyle = (status?: string) => {
    if (status === "Passed") return "bg-green-100 text-green-900 ring-green-300";
    if (status === "Failed") return "bg-red-100 text-red-900 ring-red-300";
    return "bg-yellow-100 text-yellow-900 ring-yellow-300";
  };

  if (loading) {
    return (
      <div className="p-10">
        <p className="text-lg font-bold text-slate-900">
          Loading training modules...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
          <h1 className="text-3xl font-bold text-slate-950">
            Training Modules
          </h1>
          <p className="mt-2 text-slate-700">
            Complete each module and attempt the quiz. Your marks and completion
            status will be tracked automatically.
          </p>
        </div>

        {modules.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
            <p className="font-semibold text-slate-800">
              No training modules available.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-300"
              >
                <h2 className="text-xl font-bold text-slate-950">
                  {mod.title}
                </h2>

                <p className="mt-2 text-slate-700">{mod.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${getStatusStyle(
                      mod.progress?.status
                    )}`}
                  >
                    {mod.progress?.status || "Not Started"}
                  </span>

                  {mod.progress?.quiz_attempted && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-900 ring-1 ring-blue-300">
                      Marks: {mod.progress.marks}%
                    </span>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/training/${mod.id}`)}
                  className="mt-5 rounded-xl bg-blue-700 px-5 py-2 font-bold text-white hover:bg-blue-800"
                >
                  {mod.progress?.status === "Passed"
                    ? "Review Module"
                    : "Start Module"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
