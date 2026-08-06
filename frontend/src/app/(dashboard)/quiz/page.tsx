"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notesApi, quizApi } from "@/lib/api";
import toast from "react-hot-toast";
import { BookOpen, Loader2, ChevronRight, CheckCircle, XCircle, RotateCcw, AlertCircle } from "lucide-react";
import clsx from "clsx";

const QUESTION_TYPES = ["mcq", "fill_blank", "true_false", "one_word", "descriptive", "viva", "placement"];
const DIFFICULTIES = ["easy", "medium", "hard"];

interface Question {
  question: string;
  answer: string;
  explanation?: string;
  options?: Record<string, string>;
}

export default function QuizPage() {
  const [step, setStep] = useState<"config" | "quiz" | "result">("config");
  const [noteId, setNoteId] = useState("");
  const [qType, setQType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<{ quiz_id: number; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  const { data: notesData } = useQuery({
    queryKey: ["notes-list"],
    queryFn: () => notesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const generateQuiz = async () => {
    if (!noteId) return toast.error("Please select a note");
    setLoading(true);
    try {
      const res = await quizApi.generate({ note_id: Number(noteId), question_type: qType, difficulty, count });
      setQuiz(res.data);
      setAnswers({});
      setStep("quiz");
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    const answersArr = quiz.questions.map((_, i) => ({ answer: answers[i] || "" }));
    const res = await quizApi.submit(quiz.quiz_id, answersArr);
    setResult(res.data);
    setStep("result");
  };

  if (step === "config") return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Quiz</h1>
        <p className="text-gray-500 text-sm mt-1">Create a quiz from your notes with AI</p>
      </div>
      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Select Note</label>
          <select value={noteId} onChange={(e) => setNoteId(e.target.value)} className="input">
            <option value="">— Choose a note —</option>
            {notesData?.notes?.map((n: { id: number; title: string }) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Question Type</label>
            <select value={qType} onChange={(e) => setQType(e.target.value)} className="input">
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input">
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Number of Questions: {count}</label>
          <input type="range" min={5} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-brand-600" />
        </div>
        <button onClick={generateQuiz} disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <BookOpen size={18} />}
          Generate Quiz
        </button>
      </div>
    </div>
  );

  if (step === "quiz" && quiz) return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quiz — {quiz.questions.length} Questions</h1>
        <span className="badge bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">{difficulty}</span>
      </div>
      {quiz.questions.map((q, i) => (
        <div key={i} className="card p-5">
          <p className="font-medium text-gray-900 dark:text-white mb-3">{i + 1}. {q.question}</p>
          {q.options ? (
            <div className="space-y-2">
              {Object.entries(q.options).map(([k, v]) => (
                <label key={k} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  answers[i] === k ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-gray-200 dark:border-gray-700 hover:border-brand-300"
                }`}>
                  <input type="radio" name={`q${i}`} value={k} checked={answers[i] === k} onChange={() => setAnswers({ ...answers, [i]: k })} className="accent-brand-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300"><strong>{k}.</strong> {v}</span>
                </label>
              ))}
            </div>
          ) : (
            <input placeholder="Your answer..." value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} className="input" />
          )}
        </div>
      ))}
      <button onClick={submitQuiz} className="btn-primary w-full justify-center py-3">
        Submit Quiz <ChevronRight size={18} />
      </button>
    </div>
  );

  if (step === "result" && result && quiz) return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-6">
      <div className="card p-8 text-center space-y-4">
        <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold ${result.percentage >= 60 ? "bg-green-500 shadow-lg shadow-green-500/30" : "bg-red-500 shadow-lg shadow-red-500/30"}`}>
          {result.percentage}%
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Complete!</h2>
          <p className="text-gray-500 mt-1">You scored <span className="font-bold text-gray-900 dark:text-white">{result.score}</span> out of {result.total}</p>
        </div>
        {result.percentage >= 60 ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-medium bg-green-50 dark:bg-green-900/20 py-2 px-4 rounded-full w-max mx-auto border border-green-100 dark:border-green-800"><CheckCircle size={20} /> Great job!</div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-red-500 font-medium bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-full w-max mx-auto border border-red-100 dark:border-red-800"><XCircle size={20} /> Keep practising!</div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white px-1">Review Answers</h3>
        {quiz.questions.map((q, i) => {
          const isCorrect = String(answers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          return (
            <div key={i} className={clsx(
              "card p-6 border-l-4 transition-all duration-300",
              isCorrect ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/10" : "border-l-red-500 bg-red-50/30 dark:bg-red-950/10"
            )}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{i + 1}. {q.question}</p>
                {isCorrect ? <CheckCircle className="text-green-500 shrink-0" size={24} /> : <XCircle className="text-red-500 shrink-0" size={24} />}
              </div>

              {q.options ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {Object.entries(q.options).map(([k, v]) => {
                    const isSelected = answers[i] === k;
                    const isTheRightAnswer = q.answer === k;
                    return (
                      <div key={k} className={clsx(
                        "p-3 rounded-lg border text-sm font-medium",
                        isTheRightAnswer ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400" :
                        isSelected ? "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400" :
                        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      )}>
                        <strong>{k}.</strong> {v}
                        {isTheRightAnswer && <span className="ml-2 text-[10px] uppercase font-bold text-green-600 dark:text-green-500">(Correct)</span>}
                        {isSelected && !isCorrect && <span className="ml-2 text-[10px] uppercase font-bold text-red-600 dark:text-red-500">(Your Choice)</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <p className="text-sm"><span className="text-gray-400">Your Answer:</span> <span className={isCorrect ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{answers[i] || "(Empty)"}</span></p>
                  {!isCorrect && <p className="text-sm"><span className="text-gray-400">Correct Answer:</span> <span className="text-green-600 font-bold">{q.answer}</span></p>}
                </div>
              )}

              {q.explanation && (
                <div className="mt-4 p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Explanation
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 pt-4 pb-10">
        <button onClick={() => setStep("config")} className="btn-primary flex-1 justify-center py-3">
          <RotateCcw size={18} /> New Quiz
        </button>
        <button onClick={() => window.print()} className="btn-secondary flex-1 justify-center py-3">
          Download PDF Report
        </button>
      </div>
    </div>
  );

  return null;
}
