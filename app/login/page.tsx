"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
    <div className="grid min-h-[75vh] items-center gap-8 lg:grid-cols-2">
      <section className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-10 text-white shadow-2xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur">
              Secure Internal Access
            </div>

            <h1 className="max-w-lg text-4xl font-bold leading-tight">
              Welcome back to your onboarding workspace.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-blue-100">
              Access training modules, upload documents, complete joining tasks,
              and track progress in one premium internal portal.
            </p>

            <div className="mt-10 grid gap-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-lg font-semibold">Training Modules</p>
                <p className="mt-1 text-sm text-blue-100">
                  Complete office process, tax basics, audit documentation, and
                  workflow modules.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-lg font-semibold">Document Upload</p>
                <p className="mt-1 text-sm text-blue-100">
                  Securely submit personal details and onboarding documents.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-lg font-semibold">Progress Tracking</p>
                <p className="mt-1 text-sm text-blue-100">
                  Monitor pending tasks and complete onboarding smoothly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-slate-200">
          <div className="mb-8">
            <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
              Sign In
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Login to continue
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use your official email and password to access the portal.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-800"
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
              className="w-full rounded-2xl bg-blue-700 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <p className="text-sm text-slate-500">
              Trouble signing in? Contact your administrator or HR team.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}