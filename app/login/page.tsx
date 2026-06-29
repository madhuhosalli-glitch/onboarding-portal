"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ModuleFeature = {
  icon: string;
  title: string;
  description: string;
};

const moduleFeatures: ModuleFeature[] = [
  {
    icon: "🎓",
    title: "Onboarding & Training",
    description: "Training modules, quizzes and learning progress.",
  },
  {
    icon: "📚",
    title: "SOP Library",
    description: "Office manuals and department-wise procedures.",
  },
  {
    icon: "✅",
    title: "SOP Compliance",
    description: "Assigned checklists and operations tracking.",
  },
  {
    icon: "💻",
    title: "IT & Assets",
    description: "Laptop support, complaints and asset records.",
  },
  {
    icon: "🏢",
    title: "Office Operations",
    description: "Opening, closing and office administration tasks.",
  },
  {
    icon: "👥",
    title: "Employee Services",
    description: "Profile, HR records and internal services.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrorMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="grid min-h-[calc(100vh-112px)] items-center gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-800 p-7 text-white shadow-2xl">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-purple-300/20 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-wide text-blue-100 backdrop-blur">
              BVC Office Portal
            </div>

            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight">
              One secure workspace for training, SOPs, IT assets and office operations.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100">
              Access your daily office tools, complete assigned learning, raise IT requests,
              review SOPs and manage internal workflows from one integrated portal.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {moduleFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-xl">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-white">
                        {feature.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-blue-100">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-bold text-white">Built for B V C & Co.</p>
              <p className="mt-1 text-xs leading-5 text-blue-100">
                Internal use only. Training progress, SOP compliance, laptop records
                and office workflows are securely tracked.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl ring-1 ring-slate-200">
          <div className="mb-6">
            <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
              Secure Login
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
              Sign in to Office Portal
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use your official BVC email address and password to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Official Email Address
              </label>

              <input
                type="email"
                placeholder="name@bvcglobal.com"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-700">
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 py-3.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] hover:from-blue-800 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing In..." : "Sign In to Office Portal"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xl font-extrabold text-slate-900">6+</p>
                <p className="text-xs text-slate-500">Office Modules</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xl font-extrabold text-slate-900">Secure</p>
                <p className="text-xs text-slate-500">Authentication</p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-slate-500">
              © 2026 B V C & Co., Chartered Accountants
              <br />
              Internal Use Only
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
