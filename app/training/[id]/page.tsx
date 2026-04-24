"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ModulePage() {
  const { id } = useParams();
  const router = useRouter();

  const [module, setModule] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const { data: mod, error: modError } = await supabase
        .from("training_modules")
        .select("*")
        .eq("id", id)
        .single();

      if (modError) {
        console.error(modError);
        setLoading(false);
        return;
      }

      setModule(mod);

      const { data: q, error: qError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", id);

      if (qError) {
        console.error(qError);
      }

      setQuestions(q || []);
      setLoading(false);
    };

    if (id) loadData();
  }, [id, router]);

  const submitQuiz = async () => {
  let correct = 0;

  questions.forEach((q) => {
    if (answers[q.id] === q.correct_option) {
      correct++;
    }
  });

  const percentage = questions.length
    ? (correct / questions.length) * 100
    : 0;

  const finalScore = Math.round(percentage);
  setScore(finalScore);

  // ✅ Get logged-in user
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return;

  // ✅ Save progress
  await supabase.from("training_progress").upsert(
    {
      user_id: user.id,
      module_id: id,
      watched: true,
      quiz_attempted: true,
      marks: finalScore,
      status: finalScore >= (module.passing_marks || 60)
        ? "Passed"
        : "Failed",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_id" }
  );
};

  if (loading) {
    return (
      <div className="p-10">
        <p className="text-lg font-semibold text-slate-900">Loading...</p>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="p-10">
        <p className="text-lg font-semibold text-red-700">Module not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <h1 className="text-3xl font-bold text-slate-950">{module.title}</h1>
          <p className="mt-2 text-base font-medium text-slate-700">
            Please complete this module and attempt the quiz.
          </p>
        </div>

        {module.video_url && (
          <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-300">
            <iframe
              src={module.video_url}
              className="h-72 w-full rounded-xl"
              allowFullScreen
            />
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <h2 className="mb-3 text-xl font-bold text-slate-950">
            Training Content
          </h2>
          <p className="leading-7 text-slate-800">{module.content}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <h2 className="mb-4 text-xl font-bold text-slate-950">Quiz</h2>

          {questions.length === 0 ? (
            <p className="text-slate-700">No quiz questions available.</p>
          ) : (
            questions.map((q, index) => (
              <div
                key={q.id}
                className="mb-5 rounded-xl border border-slate-300 bg-slate-50 p-4"
              >
                <p className="mb-3 font-bold text-slate-950">
                  {index + 1}. {q.question}
                </p>

                {["a", "b", "c", "d"].map((opt) => (
                  <label
                    key={opt}
                    className="mt-2 flex cursor-pointer items-center rounded-lg bg-white px-3 py-2 text-slate-800 ring-1 ring-slate-200 hover:bg-blue-50"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                      className="mr-3"
                    />
                    {q[`option_${opt}`]}
                  </label>
                ))}
              </div>
            ))
          )}

          {questions.length > 0 && (
            <button
              onClick={submitQuiz}
              className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800"
            >
              Submit Quiz
            </button>
          )}

          {score !== null && (
            <div
              className={`mt-5 rounded-xl p-4 text-lg font-bold ${
                score >= (module.passing_marks || 60)
                  ? "bg-green-100 text-green-900 ring-1 ring-green-300"
                  : "bg-red-100 text-red-900 ring-1 ring-red-300"
              }`}
            >
              Your Score: {score}%{" "}
              {score >= (module.passing_marks || 60) ? "- Passed" : "- Failed"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}