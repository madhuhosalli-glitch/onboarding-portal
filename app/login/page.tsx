"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function Field({ label, type, value, onChange, placeholder, right }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; right?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334", letterSpacing: "0.02em" }}>{label}</label>
        {right}
      </div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        style={{ width: "100%", border: "1.5px solid #d8ddd8", borderRadius: 9, padding: "0.7rem 0.95rem", fontSize: "0.9rem", color: "#1a1a1a", background: "#fafaf8", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
        onFocus={e => { e.currentTarget.style.borderColor = "#2c5f2e"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(44,95,46,0.11)"; e.currentTarget.style.background = "#fff"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#d8ddd8"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#fafaf8"; }}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push("/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* Left — forest green brand panel */}
      <div style={{ background: "var(--forest)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 380, height: 380, borderRadius: "50%", background: "rgba(201,168,76,0.07)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2.5rem" }}>
            <img src="/logo.png" alt="BVC Logo" style={{ height: 52, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>BVC & Co.</div>
              <div style={{ color: "var(--gold)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Chartered Accountants</div>
            </div>
          </div>
          <div style={{ color: "var(--gold)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.75rem" }}>BVC Office Portal</div>
          <h1 style={{ color: "#fff", fontSize: "2.5rem", fontWeight: 800, lineHeight: 1.15, marginBottom: "1rem" }}>Professional.<br />People.<br />Practical Solutions.</h1>
          <p style={{ color: "rgba(255,255,255,0.60)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "2rem", maxWidth: 360 }}>One secure workspace for training, SOPs, IT assets and office operations.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", maxWidth: 380 }}>
            {[
              ["▶", "Training", "Modules, quizzes & progress"],
              ["📚", "SOP Library", "Manuals & procedures"],
              ["✅", "Compliance", "Checklists & tracking"],
              ["💻", "IT Assets", "Laptop support & records"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 11, padding: "0.85rem" }}>
                <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>{icon}</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}>{title}</div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "2.5rem", color: "rgba(255,255,255,0.28)", fontSize: "0.72rem", letterSpacing: "0.12em" }}>
            TRUST &nbsp;|&nbsp; COMPLIANCE &nbsp;|&nbsp; GROWTH
          </div>
        </div>
      </div>

      {/* Right — login form, perfectly symmetric */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", background: "#fafaf8" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Header */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ color: "var(--forest)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Secure Login</div>
            <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--forest)", lineHeight: 1.2, marginBottom: "0.5rem" }}>Sign in to<br />Office Portal</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>For B V C & Co. employees only.</p>
          </div>

          {/* Form — all fields same width, same label style */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <Field label="Official Email Address" type="email" value={email} onChange={setEmail} placeholder="name@bvcglobal.com" />
            <Field
              label="Password" type={showPw ? "text" : "password"} value={password} onChange={setPassword} placeholder="Enter your password"
              right={
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", border: "none", color: "var(--forest-mid)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  {showPw ? "Hide" : "Show"}
                </button>
              }
            />

            {error && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.65rem 1rem", color: "#991b1b", fontSize: "0.83rem", fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: loading ? "var(--muted)" : "var(--forest)", color: "#fff", border: "none",
              borderRadius: 10, padding: "0.82rem", fontSize: "0.92rem", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.02em",
              transition: "all 0.15s", marginTop: "0.2rem",
              boxShadow: loading ? "none" : "0 4px 14px rgba(26,58,42,0.28)",
            }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(26,58,42,0.36)"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = loading ? "none" : "0 4px 14px rgba(26,58,42,0.28)"; }}
            >
              {loading ? "Signing In..." : "Sign In to Office Portal"}
            </button>
          </form>

          <p style={{ marginTop: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.72rem", lineHeight: 1.6 }}>
            © 2026 B V C & Co., Chartered Accountants<br />Internal Use Only
          </p>
        </div>
      </div>
    </div>
  );
}
