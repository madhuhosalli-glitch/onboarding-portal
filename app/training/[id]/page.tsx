"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import PortalShell from "../../../components/PortalShell";

type QuizQuestion = {
  id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string;
};
type TrainingModule = {
  id: string; title: string; description?: string; content?: string; video_url?: string; passing_marks?: number;
};

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const maxAllowedTimeRef = useRef(0);
  const lastSafeTimeRef = useRef(0);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [profileName, setProfileName] = useState("");
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [message, setMessage] = useState("");

  const isAdminOrPartner = role.toLowerCase().includes("admin") || role.toLowerCase().includes("partner");

  const navigate = (href: string) => {
    const overlay = document.getElementById("page-transition-overlay");
    if (overlay) { overlay.classList.add("active"); setTimeout(() => { router.push(href); setTimeout(() => overlay.classList.remove("active"), 80); }, 120); }
    else router.push(href);
  };

  useEffect(() => {
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push("/login"); return; }
      const uid = userData.user.id;
      setUserId(uid);
      const [pr, mod, prog, q] = await Promise.all([
        supabase.from("employee_profiles").select("role,full_name").eq("user_id", uid).single(),
        supabase.from("training_modules").select("*").eq("id", id).single(),
        supabase.from("training_progress").select("*").eq("user_id", uid).eq("module_id", id).maybeSingle(),
        supabase.from("quiz_questions").select("*").eq("module_id", id),
      ]);
      setRole(pr.data?.role || "");
      setProfileName(pr.data?.full_name || "");
      setModule(mod.data);
      if (prog.data?.watched) setVideoCompleted(true);
      if (prog.data?.quiz_attempted && typeof prog.data?.marks === "number") setScore(prog.data.marks);
      setQuestions(q.data || []);
      setLoading(false);
    };
    if (id) loadData();
  }, [id, router]);

  const saveVideoCompleted = async () => {
    if (!userId || !id) return;
    await supabase.from("training_progress").upsert(
      { user_id: userId, module_id: id, watched: true, video_completed_at: new Date().toISOString(), status: isAdminOrPartner ? "Viewed by Admin/Partner" : "Video Completed" },
      { onConflict: "user_id,module_id" }
    );
    setVideoCompleted(true);
    setMessage(isAdminOrPartner ? "Video viewing status saved. Quiz is optional for this role." : "Video completed. You can now take the quiz.");
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const current = video.currentTime;
    if (!isAdminOrPartner && current > maxAllowedTimeRef.current + 1.25) {
      video.currentTime = lastSafeTimeRef.current;
      setMessage("Fast-forward is disabled for Articles and Employees."); return;
    }
    if (current > maxAllowedTimeRef.current) maxAllowedTimeRef.current = current;
    lastSafeTimeRef.current = current;
    const percent = Math.min(100, Math.round((current / video.duration) * 100));
    setVideoProgressPercent(percent);
    if (percent >= 95 && !videoCompleted) saveVideoCompleted();
  };

  const handleSeeking = () => {
    const video = videoRef.current;
    if (!video || isAdminOrPartner) return;
    if (video.currentTime > maxAllowedTimeRef.current + 1.25) {
      video.currentTime = lastSafeTimeRef.current;
      setMessage("Forward skipping is not allowed. You may pause or rewind only.");
    }
  };

  const submitQuiz = async () => {
    if (!module) return;
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct_option) correct++; });
    const finalScore = Math.round(questions.length ? (correct / questions.length) * 100 : 0);
    const finalStatus = finalScore >= (module.passing_marks || 60) ? "Passed" : "Failed";
    setScore(finalScore);
    await supabase.from("training_progress").upsert(
      { user_id: userId, module_id: id, watched: true, quiz_attempted: true, marks: finalScore, status: finalStatus, completed_at: new Date().toISOString() },
      { onConflict: "user_id,module_id" }
    );
    setMessage("Quiz submitted successfully.");
  };

  if (loading || !module) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--forest)", fontWeight: 700 }}>Loading module...</div>
    </div>
  );

  const passed = score !== null && score >= (module.passing_marks || 60);

  return (
    <PortalShell isAdminOrPartner={isAdminOrPartner} profileName={profileName} pageTitle={module.title}>
      {/* Back button + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <button onClick={() => navigate("/training")} style={{
          background: "none", border: "1.5px solid var(--border)", borderRadius: 8,
          padding: "0.4rem 0.85rem", fontSize: "0.82rem", fontWeight: 700,
          color: "var(--forest)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4
        }}>← Training</button>
        <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>/ {module.title}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.25rem", alignItems: "start" }}>
        {/* Main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Module header */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: "0.4rem" }}>{module.title}</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "1rem" }}>{module.description}</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className={`badge ${isAdminOrPartner ? "badge-blue" : "badge-gold"}`}>Role: {role || "User"}</span>
              <span className={`badge ${videoCompleted ? "badge-green" : "badge-yellow"}`}>
                Video: {videoCompleted ? "Completed ✓" : `${videoProgressPercent}% watched`}
              </span>
              {score !== null && <span className={`badge ${passed ? "badge-green" : "badge-red"}`}>Score: {score}%</span>}
            </div>
          </div>

          {/* Video */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <video
              ref={videoRef}
              src={module.video_url}
              controls
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onTimeUpdate={handleVideoTimeUpdate}
              onSeeking={handleSeeking}
              onEnded={saveVideoCompleted}
              style={{ width: "100%", borderRadius: 10, background: "#000", display: "block" }}
            />
            <div style={{ marginTop: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Watch progress</span>
                <span style={{ fontSize: "0.75rem", color: "var(--forest)", fontWeight: 700 }}>{videoCompleted ? "100%" : `${videoProgressPercent}%`}</span>
              </div>
              <div style={{ height: 6, background: "#e8ede8", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--forest)", borderRadius: 3, width: `${videoCompleted ? 100 : videoProgressPercent}%`, transition: "width 0.3s" }} />
              </div>
            </div>
            <p style={{ marginTop: "0.65rem", fontSize: "0.78rem", color: "var(--muted)" }}>
              {isAdminOrPartner ? "Admin/Partner: forwarding allowed, quiz optional." : "Pause and rewind allowed. Fast-forward is disabled."}
            </p>
          </div>

          {/* Quiz section */}
          {isAdminOrPartner ? (
            <div className="card" style={{ padding: "1.25rem", borderLeft: "3px solid var(--forest-mid)" }}>
              <p style={{ color: "var(--forest)", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Quiz is not mandatory for Admins and Partners.</p>
              <button onClick={() => setShowQuiz(!showQuiz)} className="btn-outline">{showQuiz ? "Hide Quiz Preview" : "Preview Quiz"}</button>
            </div>
          ) : !videoCompleted ? (
            <div className="card" style={{ padding: "1.25rem", borderLeft: "3px solid var(--gold)", background: "#fffdf0" }}>
              <p style={{ color: "#92400e", fontWeight: 600, fontSize: "0.9rem" }}>⏳ Please watch the complete video to unlock the quiz.</p>
            </div>
          ) : !showQuiz ? (
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ color: "var(--forest)", fontWeight: 600, marginBottom: "0.75rem" }}>
                {score !== null ? `You scored ${score}%. ${passed ? "You passed! You can review or retake below." : "You did not pass. Try again."}` : "Video completed! Take the quiz to finish this module."}
              </p>
              <button onClick={() => setShowQuiz(true)} className={passed ? "btn-outline" : "btn-primary"} style={{ padding: "0.6rem 1.5rem" }}>
                {score !== null ? (passed ? "Review / Retake Quiz" : "Retake Quiz") : "Take Quiz →"}
              </button>
            </div>
          ) : null}

          {showQuiz && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontWeight: 800, color: "var(--forest)", fontSize: "1.1rem", marginBottom: "1.25rem" }}>
                {isAdminOrPartner ? "Quiz Preview" : "Quiz"} · {questions.length} Questions
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.1rem" }}>
                    <p style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.92rem", marginBottom: "0.65rem" }}>{i + 1}. {q.question}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {(["a", "b", "c", "d"] as const).map((opt) => {
                        const selected = answers[q.id] === opt;
                        return (
                          <label key={opt} style={{
                            display: "flex", alignItems: "center", gap: "0.7rem",
                            padding: "0.6rem 0.85rem", borderRadius: 8, cursor: "pointer",
                            background: selected ? "#e8f4ec" : "#f8faf8",
                            border: `1.5px solid ${selected ? "var(--forest-mid)" : "var(--border)"}`,
                            transition: "all 0.12s",
                          }}>
                            <input type="radio" name={q.id} value={opt}
                              checked={selected} onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                              style={{ accentColor: "var(--forest)" }} />
                            <span style={{ fontSize: "0.88rem", color: "var(--text)" }}>
                              <strong style={{ color: "var(--forest)", marginRight: 4 }}>{opt.toUpperCase()}.</strong>
                              {q[`option_${opt}` as keyof QuizQuestion]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {!isAdminOrPartner && (
                <button onClick={submitQuiz} className="btn-primary" style={{ marginTop: "1.25rem", padding: "0.75rem 2rem" }}>
                  Submit Quiz
                </button>
              )}
              {score !== null && (
                <div style={{
                  marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: 10,
                  background: passed ? "#dcfce7" : "#fee2e2",
                  borderLeft: `4px solid ${passed ? "#16a34a" : "#dc2626"}`,
                }}>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: passed ? "#166534" : "#991b1b" }}>
                    {passed ? "🎉 Passed!" : "Not passed"} — Score: {score}%
                  </div>
                  <div style={{ fontSize: "0.82rem", color: passed ? "#15803d" : "#b91c1c", marginTop: 4 }}>
                    {passed ? "Well done! Module completed." : `You need ${module.passing_marks || 60}% to pass. Please retake the quiz.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {message && (
            <div style={{ background: "#f0f7f0", border: "1px solid var(--border)", borderRadius: 10, padding: "0.85rem 1.1rem", color: "var(--forest)", fontWeight: 600, fontSize: "0.88rem" }}>
              {message}
            </div>
          )}
        </div>

        {/* Right sidebar — module info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "80px" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.85rem", marginBottom: "0.85rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Module Info</div>
            {[
              { label: "Status", value: score !== null ? (passed ? "Passed ✓" : "Failed") : (videoCompleted ? "Video Done" : "In Progress") },
              { label: "Passing Marks", value: `${module.passing_marks || 60}%` },
              { label: "Questions", value: questions.length },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--muted)" }}>{row.label}</span>
                <span style={{ fontWeight: 700, color: "var(--forest)" }}>{row.value}</span>
              </div>
            ))}
          </div>

          <button onClick={() => navigate("/training")} className="btn-outline" style={{ width: "100%", padding: "0.65rem" }}>
            ← All Modules
          </button>
          <button onClick={() => navigate("/dashboard")} className="btn-outline" style={{ width: "100%", padding: "0.65rem" }}>
            ⊞ Dashboard
          </button>
        </div>
      </div>
    </PortalShell>
  );
}
