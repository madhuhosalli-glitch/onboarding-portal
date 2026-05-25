"use client";

import { useEffect, useRef, useState } from "react";
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const maxAllowedTimeRef = useRef(0);
  const lastSafeTimeRef = useRef(0);

  const [userId, setUserId] = useState("");
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setUserId(userData.user.id);

      const { data: mod } = await supabase
        .from("training_modules")
        .select("*")
        .eq("id", id)
        .single();

      setModule(mod);

      const { data: progressData } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("module_id", id)
        .maybeSingle();

      if (progressData?.watched) {
        setVideoCompleted(true);
      }

      const { data: q } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", id);

      setQuestions(q || []);
      setLoading(false);
    };

    if (id) {
      loadData();
    }
  }, [id, router]);

  const saveVideoCompleted = async () => {
    await supabase.from("training_progress").upsert(
      {
        user_id: userId,
        module_id: id,
        watched: true,
        video_completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" }
    );

    setVideoCompleted(true);
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;

    if (current > maxAllowedTimeRef.current + 1.25) {
      video.currentTime = lastSafeTimeRef.current;
      return;
    }

    if (current > maxAllowedTimeRef.current) {
      maxAllowedTimeRef.current = current;
    }

    lastSafeTimeRef.current = current;

    const percent = Math.min(
      100,
      Math.round((current / video.duration) * 100)
    );

    setVideoProgressPercent(percent);

    if (percent >= 95 && !videoCompleted) {
      saveVideoCompleted();
    }
  };

  const handleSeeking = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.currentTime > maxAllowedTimeRef.current + 1.25) {
      video.currentTime = lastSafeTimeRef.current;
    }
  };

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

    setScore(finalScore);

    await supabase.from("training_progress").upsert(
      {
        user_id: userId,
        module_id: id,
        watched: true,
        quiz_attempted: true,
        marks: finalScore,
        status:
          finalScore >= (module.passing_marks || 60)
            ? "Passed"
            : "Failed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" }
    );
  };

  if (loading || !module) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">

          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              ← Back
            </button>
          </div>

          <h1 className="text-3xl font-bold text-slate-950">
            {module.title}
          </h1>

          <p className="mt-2 text-base font-medium text-slate-700">
            {module.description}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-300">

          <video
            ref={videoRef}
            src={module.video_url}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onTimeUpdate={handleVideoTimeUpdate}
            onSeeking={handleSeeking}
            className="h-auto w-full rounded-xl bg-black"
          />

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-700 transition-all"
              style={{
                width: `${videoCompleted ? 100 : videoProgressPercent}%`,
              }}
            />
          </div>

          <p className="mt-3 text-sm font-medium text-slate-700">
            Video Progress:{" "}
            {videoCompleted
              ? "Completed"
              : `${videoProgressPercent}% watched`}
          </p>
        </div>

        {!videoCompleted ? (
          <div className="rounded-2xl bg-yellow-50 p-6 ring-1 ring-yellow-300">
            <p className="font-semibold text-yellow-900">
              Please complete the video to unlock the quiz.
            </p>
          </div>
        ) : !showQuiz ? (
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">

            <button
              onClick={() => setShowQuiz(true)}
              className="rounded-xl bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800"
            >
              Take Quiz
            </button>

          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">

            <h2 className="mb-4 text-xl font-bold text-slate-950">
              Quiz
            </h2>

            {questions.map((q, index) => (
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
            ))}

            <button
              onClick={submitQuiz}
              className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800"
            >
              Submit Quiz
            </button>

            {score !== null && (
              <div
                className={`mt-5 rounded-xl p-4 text-lg font-bold ${
                  score >= (module.passing_marks || 60)
                    ? "bg-green-100 text-green-900"
                    : "bg-red-100 text-red-900"
                }`}
              >
                Your Score: {score}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}