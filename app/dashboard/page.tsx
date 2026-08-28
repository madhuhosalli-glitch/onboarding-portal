"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ModuleAction = {
  label: string;
  href: string;
};

type PortalModule = {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: string;
  stats: string;
  actions: ModuleAction[];
  hidden?: boolean;
};

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
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace("/login");
          return;
        }

        const uid = userData.user.id;
        if (!cancelled) {
          setUserId(uid);
          setUserEmail(userData.user.email || "");
        }

        const [profileResult, modulesResult, progressResult] = await Promise.all([
          supabase
            .from("employee_profiles")
            .select("user_id,full_name,personal_email,mobile_number,sro_number,foundation_marks,ipcc_group1_marks,ipcc_group2_marks,role,password_changed")
            .eq("user_id", uid)
            .single(),
          supabase
            .from("training_modules")
            .select("id,title,description,display_order")
            .order("display_order", { ascending: true }),
          supabase
            .from("training_progress")
            .select("module_id,status,quiz_attempted,marks,watched")
            .eq("user_id", uid),
        ]);

        if (profileResult.error) console.error("Profile load error:", profileResult.error);
        if (modulesResult.error) console.error("Training modules load error:", modulesResult.error);
        if (progressResult.error) console.error("Training progress load error:", progressResult.error);

        if (cancelled) return;

        const profileData = profileResult.data;
        setProfile(profileData);
        setFullName(profileData?.full_name || "");
        setPersonalEmail(profileData?.personal_email || "");
        setMobileNumber(profileData?.mobile_number || "");
        setSroNumber(profileData?.sro_number || "");
        setFoundationMarks(profileData?.foundation_marks || "");
        setIpccGroup1Marks(profileData?.ipcc_group1_marks || "");
        setIpccGroup2Marks(profileData?.ipcc_group2_marks || "");
        setModules(modulesResult.data || []);
        setProgress(progressResult.data || []);
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  const completedTraining = progress.filter((p) => p.status === "Passed").length;
  const attemptedTraining = progress.filter((p) => p.quiz_attempted).length;
  const pendingTraining = Math.max(modules.length - completedTraining, 0);
  const trainingPercent = modules.length > 0 ? Math.round((completedTraining / modules.length) * 100) : 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const portalModules: PortalModule[] = [
    {
      title: "Onboarding & Learning",
      subtitle: "Training, quiz and SOP library",
      description: "Complete training modules, review SOPs and track your onboarding progress.",
      icon: "🎓",
      gradient: "from-blue-700 via-indigo-700 to-slate-900",
      stats: `${completedTraining}/${modules.length} training completed`,
      actions: [
        { label: "Training Modules", href: "/training" },
        { label: "SOP Library", href: "/sops" },
      ],
    },
    {
      title: "IT & Assets",
      subtitle: "Laptop support and assets",
      description: "Raise laptop complaints, check IT support and track assigned laptop issues.",
      icon: "💻",
      gradient: "from-cyan-700 via-teal-700 to-slate-900",
      stats: "Laptop support active",
      actions: [{ label: "Laptop Support", href: "/laptops" }],
    },
    {
      title: "Office Operations",
      subtitle: "SOP compliance and checklists",
      description: "Complete assigned operational checklists and monitor office process compliance.",
      icon: "📋",
      gradient: "from-orange-600 via-amber-700 to-slate-900",
      stats: "Daily and periodic SOPs",
      actions: [{ label: "SOP Compliance", href: "/admin/sop-compliance" }],
      hidden: !isAdminOrPartner,
    },
    {
      title: "Administration",
      subtitle: "Employees, reports and controls",
      description: "Manage employees, laptop inventory, SOP compliance, training reports and internal systems.",
      icon: "👥",
      gradient: "from-purple-700 via-violet-700 to-slate-900",
      stats: "Partner/Admin access",
      actions: [{ label: "Admin Portal", href: "/admin" }],
      hidden: !isAdminOrPartner,
    },
  ];

  if (loading) {
    return <div className="p-10 text-xl font-bold text-slate-900">Loading BVC Office Portal...</div>;
  }

  if (passwordNotChanged) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-red-700 to-slate-900 p-8 text-white shadow-2xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold">Change Default Password</h1>
                <p className="mt-2 text-red-100">For security, please change your password before accessing the Office Portal.</p>
                <p className="mt-2 text-sm text-red-200">Logged in as: {userEmail}</p>
              </div>
              <button onClick={handleLogout} className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-red-700 hover:bg-red-50">Logout</button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <form onSubmit={handleChangePassword} className="grid gap-5">
              <Input label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
              <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
              <button type="submit" disabled={saving} className="rounded-2xl bg-red-700 px-7 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-70">
                {saving ? "Changing..." : "Change Password"}
              </button>
              {message && <p className="text-sm font-bold text-red-700">{message}</p>}
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
                <h1 className="text-3xl font-extrabold">Welcome, {fullName || "Team Member"}</h1>
                <p className="mt-2 text-blue-100">Please complete your basic profile before accessing the Office Portal.</p>
                <p className="mt-2 text-sm text-blue-200">Logged in as: {userEmail}</p>
              </div>
              <button onClick={handleLogout} className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700">Logout</button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-950">First Login Details</h2>
            <p className="mt-2 text-slate-600">Complete this once to activate your Office Portal profile.</p>

            <form onSubmit={handleSaveProfile} className="mt-8 grid gap-5 md:grid-cols-2">
              <Input label="Full Name" value={fullName} onChange={setFullName} />
              <Input label="Personal Email ID" type="email" value={personalEmail} onChange={setPersonalEmail} />
              <Input label="Mobile Number" value={mobileNumber} onChange={setMobileNumber} />
              <Input label="Role" value={profile?.role || "-"} onChange={() => {}} disabled />

              {isArticle && (
                <>
                  <Input label="SRO Number" value={sroNumber} onChange={setSroNumber} />
                  <Input label="Foundation Marks" value={foundationMarks} onChange={setFoundationMarks} />
                  <Input label="IPCC / Inter Group 1 Marks" value={ipccGroup1Marks} onChange={setIpccGroup1Marks} />
                  <Input label="IPCC / Inter Group 2 Marks" value={ipccGroup2Marks} onChange={setIpccGroup2Marks} />
                </>
              )}

              <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={saving} className="rounded-2xl bg-blue-700 px-7 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-70">
                  {saving ? "Saving..." : "Save and Continue"}
                </button>
                {message && <p className="text-sm font-bold text-red-700">{message}</p>}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-78px)] bg-slate-100">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-[2rem] bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 p-5 text-white shadow-2xl lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl font-black ring-1 ring-white/10">B</div>
            <div>
              <p className="text-lg font-extrabold leading-5">BVC</p>
              <p className="text-xs font-semibold text-blue-200">Office Portal</p>
            </div>
          </div>

          <nav className="grid gap-2 text-sm font-bold">
            <SidebarButton icon="🏠" label="Home" active onClick={() => router.push("/dashboard")} />
            <SidebarButton icon="🎓" label="Onboarding" onClick={() => router.push("/training")} />
            <SidebarButton icon="💻" label="IT Assets" onClick={() => router.push("/laptops")} />
            <SidebarButton icon="📚" label="SOP Library" onClick={() => router.push("/sops")} />
            {isAdminOrPartner && <SidebarButton icon="✅" label="SOP Compliance" onClick={() => router.push("/admin/sop-compliance")} />}
            {isAdminOrPartner && <SidebarButton icon="👥" label="Employees" onClick={() => router.push("/admin/employees")} />}
            {isAdminOrPartner && <SidebarButton icon="📊" label="Reports" onClick={() => router.push("/admin")} />}
            <SidebarButton icon="👤" label="Profile" onClick={() => router.push("/profile")} />
          </nav>

          <button onClick={handleLogout} className="mt-10 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/90 hover:bg-white/10">
            <span>🚪</span> Logout
          </button>
        </aside>

        <main className="space-y-6">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-700">BVC Office Portal</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 lg:text-4xl">
                  {greeting}, {profile?.full_name || "Team Member"} 👋
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-600">Welcome to your internal office workspace.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="hidden min-w-64 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200 md:block">
                  🔍 Search anything...
                </div>
                <button className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 ring-1 ring-slate-200">🔔</button>
                <button onClick={() => router.push("/profile")} className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white">
                  {profile?.full_name?.split(" ")?.[0] || "Profile"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard title="Training Progress" value={`${trainingPercent}%`} color="bg-blue-700" />
            <SummaryCard title="Pending Training" value={pendingTraining} color="bg-yellow-600" />
            <SummaryCard title="Quiz Attempted" value={attemptedTraining} color="bg-green-700" />
            <SummaryCard title="Role" value={profile?.role || "-"} color="bg-slate-900" />
          </div>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {portalModules.filter((m) => !m.hidden).map((module) => (
              <ModuleCard key={module.title} module={module} router={router} />
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <InfoPanel title="Today's Tasks" items={[`${pendingTraining} training modules pending`, "Review assigned SOP checklists", "Check laptop support status"]} />
            <InfoPanel title="Announcements" items={["BVC Office Portal is now live", "Use office.bvcai.in for production access", "New SOP compliance module added"]} />
            <InfoPanel title="Upcoming Deadlines" items={["Monthly SOP compliance", "IT asset verification", "Training module completion"]} />
          </section>
        </main>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={!disabled}
        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white disabled:bg-slate-200 disabled:text-slate-700"
      />
    </div>
  );
}

function SidebarButton({ icon, label, active = false, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${active ? "bg-blue-700 text-white shadow-lg" : "text-white/85 hover:bg-white/10 hover:text-white"}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SummaryCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <div className={`${color} rounded-2xl p-5 text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl`}>
      <p className="text-sm font-bold text-white/80">{title}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function ModuleCard({ module, router }: { module: PortalModule; router: any }) {
  return (
    <div className={`rounded-[2rem] bg-gradient-to-br ${module.gradient} p-6 text-white shadow-2xl transition duration-200 hover:-translate-y-2 hover:shadow-[0_25px_60px_rgba(15,23,42,0.35)]`}>
      <div className="text-5xl">{module.icon}</div>
      <h2 className="mt-5 text-2xl font-extrabold leading-tight">{module.title}</h2>
      <p className="mt-1 text-sm font-bold text-white/80">{module.subtitle}</p>
      <p className="mt-4 min-h-20 text-sm leading-6 text-white/80">{module.description}</p>
      <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold ring-1 ring-white/10">{module.stats}</div>
      <div className="mt-5 flex flex-wrap gap-2">
        {module.actions.map((action) => (
          <button key={action.href} onClick={() => router.push(action.href)} className="rounded-2xl bg-white px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-100">
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-extrabold text-slate-950">{title}</h3>
        <button className="text-xs font-bold text-blue-700">View All</button>
      </div>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
