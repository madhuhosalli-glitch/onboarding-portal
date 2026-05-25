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

type TrainingProgress = {
  watched?: boolean;
  quiz_attempted?: boolean;
  marks?: number;
  status?: string;
  video_completed_at?: string | null;
  completed_at?: string | null;
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
  const [existingProgress, setExistingProgress] =
    useState<TrainingProgress | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [savingVideoCompletion, setSavingVideoCompletion] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const uid = userData.user.id;
      setUserId(uid);

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

      const { data: progressData } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", uid)
        .eq("module_id", id)
        .maybeSingle();

      if (progressData) {
        setExistingProgress(progressData);
        setVideoCompleted(Boolean(progressData.watched));
        if (progressData.quiz_attempted && typeof progressData.marks === "number") {
          setScore(progressData.marks);
        }
      }

      const { data: q, error: qError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", id)
        .order("id", { ascending: true });

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

  const saveVideoCompleted = async () => {
    if (!userId || !id || savingVideoCompletion) return;

    setSavingVideoCompletion(true);

    const { error } = await supabase.from("training_progress").upsert(
      {
        user_id: userId,
        module_id: id,
        watched: true,
        video_completed_at: new Date().toISOString(),
        quiz_attempted: existingProgress?.quiz_attempted || false,
        marks: existingProgress?.marks || 0,
        status: existingProgress?.status || "Video Completed",
      },
      { onConflict: "user_id,module_id" }
    );

    if (error) {
      console.error(error);
      setMessage("Video completed, but completion could not be saved.");
    } else {
      setVideoCompleted(true);
      setExistingProgress((prev) => ({
        ...(prev || {}),
        watched: true,
        status: prev?.quiz_attempted ? prev.status : "Video Completed",
        video_completed_at: new Date().toISOString(),
      }));
      setMessage("Video completed. Quiz is now unlocked.");
    }

    setSavingVideoCompletion(false);
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;

    if (current > maxAllowedTimeRef.current + 1.25) {
      video.currentTime = lastSafeTimeRef.current;
      setMessage("Fast-forward is disabled. Please watch the video in sequence.");
      return;
    }

    if (current > maxAllowedTimeRef.current) {
      maxAllowedTimeRef.current = current;
    }

    lastSafeTimeRef.current = current;

    const percent = Math.min(100, Math.round((current / video.duration) * 100));
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
      setMessage("Forward skipping is not allowed. You may pause or rewind only.");
    }
  };

  const handleVideoEnded = () => {
    if (!videoCompleted) {
      saveVideoCompleted();
    }
  };

  const submitQuiz = async () => {
    if (!module || !videoCompleted) return;

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

    const { error } = await supabase.from("training_progress").upsert(
      {
        user_id: userId,
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

    setExistingProgress((prev) => ({
      ...(prev || {}),
      watched: true,
      quiz_attempted: true,
      marks: finalScore,
      status: finalStatus,
      completed_at: new Date().toISOString(),
    }));

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
        <p className="text-lg font-semibold text-red-700">Module not found.</p>
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
      <div className="mx-auto max-w-5xl space-y-6">
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

          <div className="mt-4 flex flex-wrap gap-3">
            <span
              className={`rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${
                videoCompleted
                  ? "bg-green-100 text-green-900 ring-green-300"
                  : "bg-yellow-100 text-yellow-900 ring-yellow-300"
              }`}
            >
              Video: {videoCompleted ? "Completed" : `${videoProgressPercent}% watched`}
            </span>

            <span
              className={`rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${
                existingProgress?.quiz_attempted
                  ? "bg-blue-100 text-blue-900 ring-blue-300"
                  : "bg-slate-100 text-slate-700 ring-slate-300"
              }`}
            >
              Quiz: {existingProgress?.quiz_attempted ? "Attempted" : "Locked"}
            </span>
          </div>
        </div>

        {module.video_url && (
          <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-300">
            <h2 className="mb-3 text-xl font-bold text-slate-950">
              Training Video
            </h2>

            <video
              ref={videoRef}
              src={module.video_url}
              controls
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onTimeUpdate={handleVideoTimeUpdate}
              onSeeking={handleSeeking}
              onEnded={handleVideoEnded}
              className="h-auto w-full rounded-xl bg-black"
            />

            <p className="mt-3 text-sm font-medium text-slate-700">
              You may pause or rewind the video. Forward skipping is disabled.
              The quiz will unlock after the video is completed.
            </p>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-700 transition-all"
                style={{ width: `${videoCompleted ? 100 : videoProgressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <h2 className="mb-3 text-xl font-bold text-slate-950">
            Training Content
          </h2>

          <p className="whitespace-pre-line leading-7 text-slate-800">
            {module.content || "Please watch the training video and complete the quiz."}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-300">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">Quiz</h2>

            {!videoCompleted && (
              <span className="rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-bold text-yellow-900 ring-1 ring-yellow-300">
                Locked until video completion
              </span>
            )}
          </div>

          {!videoCompleted ? (
            <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-300">
              <p className="font-semibold text-slate-800">
                Please complete the video first. The quiz will appear after the
                video is watched.
              </p>
            </div>
          ) : questions.length === 0 ? (
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

          {videoCompleted && questions.length > 0 && (
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
