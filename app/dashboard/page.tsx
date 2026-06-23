"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [sroNumber, setSroNumber] = useState("");
  const [foundationMarks, setFoundationMarks] = useState("");
  const [ipccGroup1Marks, setIpccGroup1Marks] = useState("");
  const [ipccGroup2Marks, setIpccGroup2Marks] = useState("");

  const role = (profile?.role || "").toLowerCase();
  const isArticle = role.includes("article");
  const isAdminOrPartner = role.includes("admin") || role.includes("partner");

  const passwordNotChanged = profile && profile.password_changed !== true;

  const articleProfileIncomplete =
    isArticle &&
    (!profile?.personal_email ||
      !profile?.mobile_number ||
      !profile?.sro_number ||
      !profile?.foundation_marks ||
      !profile?.ipcc_group1_marks ||
      !profile?.ipcc_group2_marks);

  const normalProfileIncomplete =
    !isArticle && (!profile?.personal_email || !profile?.mobile_number);

  const needsFirstLoginForm = articleProfileIncomplete || normalProfileIncomplete;

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const uid = userData.user.id;
      setUserId(uid);
      setUserEmail(userData.user.email || "");

      const { data: profileData } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", uid)
        .single();

      setProfile(profileData);

      setFullName(profileData?.full_name || "");
      setPersonalEmail(profileData?.personal_email || "");
      setMobileNumber(profileData?.mobile_number || "");
      setSroNumber(profileData?.sro_number || "");
      setFoundationMarks(profileData?.foundation_marks || "");
      setIpccGroup1Marks(profileData?.ipcc_group1_marks || "");
      setIpccGroup2Marks(profileData?.ipcc_group2_marks || "");

      const { data: modulesData } = await supabase
        .from("training_modules")
        .select("*")
        .order("display_order", { ascending: true });

      setModules(modulesData || []);

      const { data: progressData } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", uid);

      setProgress(progressData || []);

      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const getProgress = (moduleId: string) => {
    return progress.find((p) => p.module_id === moduleId);
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setSaving(false);
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (passwordError) {
      setMessage("Password change failed: " + passwordError.message);
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("employee_profiles")
      .update({ password_changed: true })
      .eq("user_id", userId);

    if (profileError) {
      setMessage("Password changed, but profile flag failed: " + profileError.message);
      setSaving(false);
      return;
    }

    setProfile((prev: any) => ({ ...prev, password_changed: true }));
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password changed successfully. Please complete your profile.");
    setSaving(false);
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const updateData: any = {
      user_id: userId,
      full_name: fullName,
      personal_email: personalEmail,
      mobile_number: mobileNumber,
    };

    if (isArticle) {
      updateData.sro_number = sroNumber;
      updateData.foundation_marks = foundationMarks;
      updateData.ipcc_group1_marks = ipccGroup1Marks;
      updateData.ipcc_group2_marks = ipccGroup2Marks;
    }

    const { error } = await supabase.from("employee_profiles").upsert(updateData, {
      onConflict: "user_id",
    });

    if (error) {
      setMessage("Error saving profile: " + error.message);
      setSaving(false);
      return;
    }

    const { data: updatedProfile } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    setProfile(updatedProfile);
    setMessage("Profile saved successfully.");
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="p-10 text-xl font-bold text-slate-900">
        Loading Dashboard...
      </div>
    );
  }

  if (passwordNotChanged) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-red-700 to-slate-900 p-8 text-white shadow-2xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold">
                  Change Default Password
                </h1>
                <p className="mt-2 text-red-100">
                  For security, please change your password before accessing training.
                </p>
                <p className="mt-2 text-sm text-red-200">
                  Logged in as: {userEmail}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <form onSubmit={handleChangePassword} className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-red-600 focus:bg-white"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-red-600 focus:bg-white"
                  placeholder="Re-enter new password"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-red-700 px-7 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-70"
              >
                {saving ? "Changing..." : "Change Password"}
              </button>

              {message && (
                <p className="text-sm font-bold text-red-700">{message}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (needsFirstLoginForm) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-blue-900 to-slate-900 p-8 text-white shadow-2xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold">
                  Welcome, {fullName || "Team Member"}
                </h1>
                <p className="mt-2 text-blue-100">
                  Please complete your basic profile before starting training.
                </p>
                <p className="mt-2 text-sm text-blue-200">
                  Logged in as: {userEmail}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-950">
              First Login Details
            </h2>

            <p className="mt-2 text-slate-600">
              {isArticle
                ? "Since you are registered as an Article Assistant, academic details are required."
                : "Only basic contact details are required for your role."}
            </p>

            <form onSubmit={handleSaveProfile} className="mt-8 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  Personal Email ID
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  Role
                </label>
                <input
                  type="text"
                  value={profile?.role || "-"}
                  disabled
                  className="w-full rounded-2xl border border-slate-300 bg-slate-200 px-4 py-3 text-slate-700"
                />
              </div>

              {isArticle && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      SRO Number
                    </label>
                    <input
                      type="text"
                      value={sroNumber}
                      onChange={(e) => setSroNumber(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      Foundation Marks
                    </label>
                    <input
                      type="text"
                      value={foundationMarks}
                      onChange={(e) => setFoundationMarks(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      IPCC / Inter Group 1 Marks
                    </label>
                    <input
                      type="text"
                      value={ipccGroup1Marks}
                      onChange={(e) => setIpccGroup1Marks(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      IPCC / Inter Group 2 Marks
                    </label>
                    <input
                      type="text"
                      value={ipccGroup2Marks}
                      onChange={(e) => setIpccGroup2Marks(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-blue-700 px-7 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save and Continue"}
                </button>

                {message && (
                  <p className="text-sm font-bold text-red-700">{message}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-purple-900 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">
                Welcome, {profile?.full_name || "Team Member"}
              </h1>

              <p className="mt-3 text-lg text-blue-100">
                B V C & Co. Article / Employee Training Portal
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold">
                  Role: {profile?.role || "-"}
                </div>

                {isArticle && (
                  <>
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
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 pl-2 md:mt-0 md:pl-6">
              <button
                onClick={() => router.push("/profile")}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-105"
              >
                Profile
              </button>

              <button
                onClick={() => router.push("/training")}
                className="rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-blue-600"
              >
                Training Modules
              </button>

              <button
                onClick={() => router.push("/sops")}
                className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-indigo-700"
              >
                SOP Library
              </button>

              <button
                onClick={() => router.push("/laptops")}
                className="rounded-2xl bg-cyan-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-cyan-800"
              >
                Laptop Support
              </button>

              {isAdminOrPartner && (
                <button
                  onClick={() => router.push("/admin")}
                  className="rounded-2xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-purple-700"
                >
                  Admin Dashboard
                </button>
              )}

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
          <h2 className="text-3xl font-bold text-slate-950">
            Training Modules
          </h2>

          <p className="mt-1 text-slate-500">
            Complete all mandatory onboarding and professional training modules.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-2">
            {modules.map((module) => {
              const moduleProgress = getProgress(module.id);

              return (
                <div
                  key={module.id}
                  className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-950">
                        {module.display_order}. {module.title}
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
                          : moduleProgress?.watched
                          ? "bg-blue-100 text-blue-900"
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
                        {moduleProgress?.watched ? "Completed" : "Pending"}
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