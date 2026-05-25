"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type QuizQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
};

type TrainingModule = {
  id: string;
  title: string;
  description?: string;
  content?: string;
  video_url?: string;
  passing_marks?: number;
};

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [module, setModule] = useState<TrainingModule | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
        setMessage("Unable to load this training module.");
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
        setMessage("Unable to load quiz questions.");
      }

      setQuestions(q || []);
      setLoading(false);
    };

    if (id) {
      loadData();
    }
  }, [id, router]);

  const submitQuiz = async () => {
    if (!module) return;

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
    const passingMarks = module.passing_marks || 60;
    const finalStatus = finalScore >= passingMarks ? "Passed" : "Failed";

    setScore(finalScore);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("training_progress").upsert(
      {
        user_id: user.id,
        module_id: id,
        watched: true,
        quiz_attempted: true,
        marks: finalScore,
        status: finalStatus,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" }
    );

    if (error) {
      console.error(error);
      setMessage("Quiz submitted, but progress could not be saved.");
      return;
    }

    setMessage("Quiz submitted successfully.");
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
        <p className="text-lg font-semibold text-red-700">
          Module not found.
        </p>
        {message && (
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <button
            onClick={() => router.push("/training")}
            className="mb-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Back to Training Modules
          </button>

          <h1 className="text-3xl font-bold text-slate-950">
            {module.title}
          </h1>

          {module.description && (
            <p className="mt-2 text-base font-medium text-slate-700">
              {module.description}
            </p>
          )}
        </div>

        {module.video_url && (
          <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-300">
            <iframe
              src={module.video_url}
              className="h-72 w-full rounded-xl"
              allowFullScreen
              title={module.title}
            />
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <h2 className="mb-3 text-xl font-bold text-slate-950">
            Training Content
          </h2>

          <p className="whitespace-pre-line leading-7 text-slate-800">
            {module.content || "Training content will be updated shortly."}
          </p>
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
                      onChange={() =>
                        setAnswers({ ...answers, [q.id]: opt })
                      }
                      className="mr-3"
                    />
                    {q[`option_${opt}` as keyof QuizQuestion]}
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
              {score >= (module.passing_marks || 60)
                ? "- Passed"
                : "- Failed"}
            </div>
          )}

          {message && (
            <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 ring-1 ring-blue-200">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
