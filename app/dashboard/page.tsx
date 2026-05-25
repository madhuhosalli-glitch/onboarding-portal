"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "ca.madhuhegde@gmail.com";

type ProfileForm = {
  full_name: string;
  sro_number: string;
  foundation_marks: string;
  ipcc_group1_marks: string;
  ipcc_group2_marks: string;
  personal_email: string;
  mobile_number: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    sro_number: "",
    foundation_marks: "",
    ipcc_group1_marks: "",
    ipcc_group2_marks: "",
    personal_email: "",
    mobile_number: "",
  });

  const isAdmin = userEmail.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/login");
        return;
      }

      const uid = data.user.id;
      setUserId(uid);
      setUserEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("employee_profiles")
        .select("full_name,sro_number,foundation_marks,ipcc_group1_marks,ipcc_group2_marks,personal_email,mobile_number")
        .eq("user_id", uid)
        .maybeSingle();

      if (profile?.full_name && profile?.sro_number) {
        router.replace("/training");
        return;
      }

      if (profile) {
        setForm({
          full_name: profile.full_name || "",
          sro_number: profile.sro_number || "",
          foundation_marks: profile.foundation_marks?.toString() || "",
          ipcc_group1_marks: profile.ipcc_group1_marks?.toString() || "",
          ipcc_group2_marks: profile.ipcc_group2_marks?.toString() || "",
          personal_email: profile.personal_email || "",
          mobile_number: profile.mobile_number || "",
        });
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("employee_profiles").upsert(
      {
        user_id: userId,
        full_name: form.full_name.trim(),
        sro_number: form.sro_number.trim(),
        foundation_marks: form.foundation_marks ? Number(form.foundation_marks) : null,
        ipcc_group1_marks: form.ipcc_group1_marks ? Number(form.ipcc_group1_marks) : null,
        ipcc_group2_marks: form.ipcc_group2_marks ? Number(form.ipcc_group2_marks) : null,
        personal_email: form.personal_email.trim(),
        mobile_number: form.mobile_number.trim(),
        status: "Training",
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setMessage("Error saving profile: " + error.message);
      setSaving(false);
      return;
    }

    router.push("/training");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-300">
        <p className="text-slate-800">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">First Time Profile Setup</h1>
          <p className="mt-2 text-slate-700">
            Please fill these basic training details once. After saving, you will be taken directly to the Training Modules page.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-600">Logged in as: {userEmail}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <button onClick={() => router.push("/admin")} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800">
              Admin Panel
            </button>
          )}
          <button onClick={handleLogout} className="rounded-xl bg-red-700 px-5 py-2 text-sm font-bold text-white hover:bg-red-800">
            Logout
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
        <h2 className="mb-6 text-2xl font-bold text-slate-950">Article / Employee Training Profile</h2>

        <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
          <Input label="Full Name" value={form.full_name} onChange={(v) => updateField("full_name", v)} placeholder="Enter full name" required />
          <Input label="SRO Number" value={form.sro_number} onChange={(v) => updateField("sro_number", v.toUpperCase())} placeholder="Enter SRO number" required />
          <Input label="Foundation Marks" value={form.foundation_marks} onChange={(v) => updateField("foundation_marks", v)} placeholder="Enter marks" type="number" />
          <Input label="IPCC / Inter Group 1 Marks" value={form.ipcc_group1_marks} onChange={(v) => updateField("ipcc_group1_marks", v)} placeholder="Enter Group 1 marks" type="number" />
          <Input label="IPCC / Inter Group 2 Marks" value={form.ipcc_group2_marks} onChange={(v) => updateField("ipcc_group2_marks", v)} placeholder="Enter Group 2 marks" type="number" />
          <Input label="Personal Email ID" value={form.personal_email} onChange={(v) => updateField("personal_email", v)} placeholder="personal@email.com" type="email" required />
          <Input label="Mobile Number" value={form.mobile_number} onChange={(v) => updateField("mobile_number", v)} placeholder="Enter mobile number" required />

          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={saving} className="rounded-2xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-70">
              {saving ? "Saving..." : "Save and Go to Training"}
            </button>
            {message && <p className="text-sm font-semibold text-red-700">{message}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
