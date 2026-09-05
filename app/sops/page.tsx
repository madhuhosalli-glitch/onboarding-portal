"use client";

import PortalShell from "../../components/PortalShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SOPLibraryPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [sops, setSops] = useState<any[]>([]);
  const [readStatus, setReadStatus] = useState<any[]>([]);
  const [selectedSop, setSelectedSop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canMarkRead, setCanMarkRead] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadSOPs = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      setProfile(profileData);

      const { data: categoryData } = await supabase
        .from("sop_categories")
        .select("*")
        .order("display_order", { ascending: true });

      const { data: sopData } = await supabase
        .from("sops")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });

      const { data: readData } = await supabase
        .from("sop_read_status")
        .select("*")
        .eq("user_id", userData.user.id);

      setCategories(categoryData || []);
      setSops(sopData || []);
      setReadStatus(readData || []);
      setLoading(false);
    };

    loadSOPs();
  }, [router]);

  useEffect(() => {
    if (!selectedSop) return;

    setCanMarkRead(false);

    const timer = setTimeout(() => {
      setCanMarkRead(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [selectedSop]);

  const isRead = (sopId: string) => {
    return readStatus.some((r) => r.sop_id === sopId);
  };

  const markAsRead = async () => {
    if (!profile || !selectedSop) return;

    const { error } = await supabase.from("sop_read_status").upsert(
      {
        user_id: profile.user_id,
        sop_id: selectedSop.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,sop_id" }
    );

    if (error) {
      setMessage("Could not mark SOP as read: " + error.message);
      return;
    }

    setReadStatus((prev) => [
      ...prev.filter((r) => r.sop_id !== selectedSop.id),
      {
        user_id: profile.user_id,
        sop_id: selectedSop.id,
        read_at: new Date().toISOString(),
      },
    ]);

    setMessage("SOP marked as read.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const formatSopContent = (content: string) => {
    if (!content) return [];

    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  };

  if (loading) {
    return <div className="p-10 text-xl font-bold">Loading SOP Library...</div>;
  }

  if (selectedSop) {
    const lines = formatSopContent(selectedSop.sop_content || "");

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "1.75rem" }}>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 p-8 text-white shadow-2xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-4xl font-extrabold">
                  {selectedSop.title}
                </h1>

                <p className="mt-2 text-indigo-100">
                  {selectedSop.description}
                </p>

                <p className="mt-2 text-sm font-semibold text-indigo-200">
                  Please read the SOP carefully. Mark as Read will be enabled after 30 seconds.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSelectedSop(null);
                    setMessage("");
                  }}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900"
                >
                  ← Back to SOPs
                </button>

                <button
                  onClick={() => { const o=document.getElementById("page-transition-overlay"); if(o){o.classList.add("active");setTimeout(()=>{router.push("/dashboard");setTimeout(()=>o.classList.remove("active"),80)},120);}else router.push("/dashboard"); }}
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white"
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

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold text-slate-950">
                  SOP Steps
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Internal use only — B V C & Co., Chartered Accountants
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  isRead(selectedSop.id)
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {isRead(selectedSop.id) ? "Read" : "Pending"}
              </span>
            </div>

            <div className="space-y-4">
              {lines.length === 0 ? (
                <div className="rounded-2xl bg-red-50 p-5 text-sm font-bold text-red-800 ring-1 ring-red-200">
                  No SOP content has been added for this item.
                </div>
              ) : (
                lines.map((line, index) => {
                  const isHeading =
                    !line.match(/^\d+\./) &&
                    line === line.toUpperCase();

                  if (isHeading) {
                    return (
                      <div
                        key={index}
                        className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-lg font-extrabold text-white"
                      >
                        {line}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold leading-7 text-slate-900"
                    >
                      {line}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={markAsRead}
                disabled={!canMarkRead || isRead(selectedSop.id)}
                className={`rounded-2xl px-7 py-3 text-sm font-bold text-white ${
                  isRead(selectedSop.id)
                    ? "bg-green-700"
                    : canMarkRead
                    ? "bg-indigo-700 hover:bg-indigo-800"
                    : "bg-slate-400"
                }`}
              >
                {isRead(selectedSop.id)
                  ? "Already Marked as Read"
                  : canMarkRead
                  ? "Mark as Read"
                  : "Read for 30 seconds to enable"}
              </button>

              {message && (
                <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-blue-300">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalSops = sops.length;
  const readCount = readStatus.length;
  const completion =
    totalSops > 0 ? Math.round((readCount / totalSops) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "1.75rem" }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">SOP Library</h1>

              <p className="mt-2 text-indigo-100">
                Welcome, {profile?.full_name || "Team Member"}
              </p>

              <p className="mt-2 text-sm font-semibold text-indigo-200">
                SOP Completion: {readCount}/{totalSops} ({completion}%)
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { const o=document.getElementById("page-transition-overlay"); if(o){o.classList.add("active");setTimeout(()=>{router.push("/dashboard");setTimeout(()=>o.classList.remove("active"),80)},120);}else router.push("/dashboard"); }}
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

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
            <p className="text-sm font-bold text-slate-300">Total SOPs</p>
            <p className="mt-2 text-4xl font-extrabold">{totalSops}</p>
          </div>

          <div className="rounded-2xl bg-green-700 p-5 text-white shadow-lg">
            <p className="text-sm font-bold text-green-100">Read</p>
            <p className="mt-2 text-4xl font-extrabold">{readCount}</p>
          </div>

          <div className="rounded-2xl bg-indigo-700 p-5 text-white shadow-lg">
            <p className="text-sm font-bold text-indigo-100">Completion</p>
            <p className="mt-2 text-4xl font-extrabold">{completion}%</p>
          </div>
        </div>

        {categories.map((cat) => {
          const categorySops = sops.filter((s) => s.category_id === cat.id);
          const categoryRead = categorySops.filter((s) => isRead(s.id)).length;
          const categoryPercent =
            categorySops.length > 0
              ? Math.round((categoryRead / categorySops.length) * 100)
              : 0;

          return (
            <div
              key={cat.id}
              className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-bold text-slate-950">
                    {cat.name}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {categoryRead}/{categorySops.length} SOPs read
                  </p>
                </div>

                <div className="w-40">
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        categoryPercent === 100
                          ? "bg-green-600"
                          : categoryPercent > 0
                          ? "bg-indigo-600"
                          : "bg-yellow-500"
                      }`}
                      style={{ width: `${categoryPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs font-bold text-slate-700">
                    {categoryPercent}%
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {categorySops.map((sop) => (
                  <div
                    key={sop.id}
                    className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-950">
                          {sop.display_order}. {sop.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {sop.description}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isRead(sop.id)
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {isRead(sop.id) ? "Read" : "Pending"}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setMessage("");
                        setSelectedSop(sop);
                      }}
                      className="mt-6 w-full rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800"
                    >
                      Open SOP
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}