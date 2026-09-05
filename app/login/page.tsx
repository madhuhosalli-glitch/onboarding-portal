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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErrorMessage(error.message); return; }
    router.push("/dashboard");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      background: "#fff",
    }}>
      {/* Left panel — forest green brand */}
      <div style={{
        background: "var(--forest)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(201,168,76,0.08)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2.5rem" }}>
            <img src="/logo.png" alt="BVC Logo" style={{ height: 52, objectFit: "contain", filter: "brightness(1.1)" }} />
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>BVC & Co.</div>
              <div style={{ color: "var(--gold)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Chartered Accountants</div>
            </div>
          </div>

          <div style={{ color: "var(--gold)", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            BVC Office Portal
          </div>

          <h1 style={{ color: "#fff", fontSize: "2.4rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "1rem" }}>
            Professional.<br />People.<br />Practical Solutions.
          </h1>

          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: "2rem", maxWidth: 380 }}>
            One secure workspace for training, SOPs, IT assets and office operations.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", maxWidth: 400 }}>
            {[
              ["▶", "Training", "Modules, quizzes & progress"],
              ["📚", "SOP Library", "Manuals & procedures"],
              ["✅", "Compliance", "Checklists & tracking"],
              ["💻", "IT Assets", "Laptop support & records"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "0.9rem",
              }}>
                <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>{icon}</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.82rem" }}>{title}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2rem", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>
            TRUST &nbsp;|&nbsp; COMPLIANCE &nbsp;|&nbsp; GROWTH
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--cream)",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ color: "var(--forest)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Secure Login
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--forest)", marginBottom: "0.4rem" }}>
              Sign in to<br />Office Portal
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              For B V C & Co. employees only.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="form-label">Official Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@bvcglobal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "none", border: "none", color: "var(--forest-mid)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 9, padding: "0.65rem 1rem", color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "var(--muted)" : "var(--forest)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.85rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "0.25rem",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
              }}
            >
              {loading ? "Signing In..." : "Sign In to Office Portal"}
            </button>
          </form>

          <p style={{ marginTop: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.75rem" }}>
            © 2026 B V C & Co., Chartered Accountants<br />Internal Use Only
          </p>
        </div>
      </div>
    </div>
  );
}
