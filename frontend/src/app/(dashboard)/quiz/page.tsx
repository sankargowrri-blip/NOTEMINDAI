"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notesApi, quizApi } from "@/lib/api";
import toast from "react-hot-toast";
import { BookOpen, Loader2, ChevronRight, CheckCircle, XCircle, RotateCcw, AlertCircle, FileSpreadsheet } from "lucide-react";
import clsx from "clsx";
import * as XLSX from "xlsx";

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
  const [quiz, setQuiz] = useState<{ quiz_id: number; title: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  const { data: notesData } = useQuery({
    queryKey: ["notes-list"],
    queryFn: () => notesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const checkIsCorrect = (q: Question, userAnswer: string) => {
    if (!userAnswer) return false;
    const submitted = userAnswer.trim().toUpperCase();
    const correct = q.answer.trim().toUpperCase();

    // 1. Direct letter match (B == B or B == B.)
    const correctLetter = correct.replace(/[.)\s]/g, "").slice(0, 1);
    if (submitted === correctLetter) return true;

    // 2. Full text match match (for descriptive or AI format drift)
    if (submitted === correct) return true;

    // 3. MCQ Option Text match
    if (q.options) {
      const selectedOptionText = q.options[submitted]?.trim().toUpperCase();
      if (selectedOptionText && (selectedOptionText === correct || correct.includes(selectedOptionText))) {
        return true;
      }

      const correctOptionText = q.options[correctLetter]?.trim().toUpperCase();
      if (correctOptionText && (submitted === correctOptionText || correctOptionText.includes(submitted))) {
        return true;
      }
    }
    return false;
  };

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
    try {
        const res = await quizApi.submit(quiz.quiz_id, answersArr);
        setResult(res.data);
        setStep("result");
    } catch (e) {
        toast.error("Failed to submit quiz. Please try again.");
    }
  };

  const exportToExcel = () => {
    if (!quiz || !result) return;

    const data = quiz.questions.map((q, i) => {
      const isCorrect = checkIsCorrect(q, answers[i]);
      return {
        "Question No": i + 1,
        "Question": q.question,
        "Options": q.options ? Object.entries(q.options).map(([k, v]) => `${k}: ${v}`).join(" | ") : "N/A",
        "Your Answer": answers[i] || "(Skipped)",
        "Correct Answer": q.answer,
        "Status": isCorrect ? "Correct" : "Wrong",
        "Explanation": q.explanation || ""
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Results");
    XLSX.writeFile(workbook, `${quiz.title}_Report.xlsx`);
    toast.success("Excel report downloaded!");
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-4">{quiz.title}</h1>
        <span className="badge bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 shrink-0 capitalize">{difficulty}</span>
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
      <button onClick={submitQuiz} className="btn-primary w-full justify-center py-3 shadow-lg">
        Submit Quiz <ChevronRight size={18} />
      </button>
    </div>
  );

  if (step === "result" && result && quiz) return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-6">
      {/* Result Header */}
      <div className="card p-8 text-center space-y-4 shadow-xl border-t-4 border-t-brand-500">
        <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center text-white text-4xl font-bold ${result.percentage >= 60 ? "bg-green-500 shadow-lg shadow-green-500/30" : "bg-red-500 shadow-lg shadow-red-500/30"}`}>
          {result.percentage}%
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Complete!</h2>
          <p className="text-gray-500 mt-1 text-lg font-medium">
            You scored <span className="text-brand-600 dark:text-brand-400 font-bold">{result.score}</span> out of {result.total}
          </p>
        </div>
        {result.percentage >= 60 ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-bold bg-green-50 dark:bg-green-900/20 py-2 px-6 rounded-full w-max mx-auto border border-green-200 dark:border-green-800"><CheckCircle size={20} /> Excellent Performance!</div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-red-500 font-bold bg-red-50 dark:bg-red-900/20 py-2 px-6 rounded-full w-max mx-auto border border-red-200 dark:border-red-800"><XCircle size={20} /> Don't give up! Keep practicing.</div>
        )}
      </div>

      {/* Review Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Detailed Review</h3>
            <p className="text-sm font-bold text-brand-600 bg-brand-50 dark:bg-brand-950 px-3 py-1 rounded-lg">Accuracy: {result.percentage}%</p>
        </div>

        {quiz.questions.map((q, i) => {
          const isCorrect = checkIsCorrect(q, answers[i]);
          return (
            <div key={i} className={clsx(
              "card p-6 border-l-4 transition-all duration-300 shadow-sm",
              isCorrect ? "border-l-green-500 bg-green-50/20 dark:bg-green-950/10" : "border-l-red-500 bg-red-50/20 dark:bg-red-950/10"
            )}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <p className="font-bold text-gray-900 dark:text-white text-lg leading-snug">{i + 1}. {q.question}</p>
                {isCorrect ? <CheckCircle className="text-green-500 shrink-0" size={26} /> : <XCircle className="text-red-500 shrink-0" size={26} />}
              </div>

              {q.options ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {Object.entries(q.options).map(([k, v]) => {
                    const isSelected = answers[i] === k;
                    const isTheRightAnswer = checkIsCorrect(q, k);

                    return (
                      <div key={k} className={clsx(
                        "p-4 rounded-xl border-2 text-sm font-semibold transition-all relative overflow-hidden",
                        isTheRightAnswer ? "bg-green-100/50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-400 ring-4 ring-green-500/10" :
                        isSelected ? "bg-red-100/50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-400" :
                        "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 opacity-60"
                      )}>
                        <div className="flex items-center justify-between gap-2">
                            <span><strong>{k}.</strong> {v}</span>
                            {isTheRightAnswer && <CheckCircle className="text-green-600 shrink-0" size={16} />}
                            {isSelected && !isCorrect && <XCircle className="text-red-600 shrink-0" size={16} />}
                        </div>
                        {isTheRightAnswer && <span className="text-[9px] uppercase font-black text-green-600 dark:text-green-500 block mt-2 tracking-tighter">✓ Correct Answer</span>}
                        {isSelected && !isCorrect && <span className="text-[9px] uppercase font-black text-red-600 dark:text-red-500 block mt-2 tracking-tighter">✗ Your Incorrect Choice</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3 mb-4 bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium"><span className="text-gray-400">Your Answer:</span> <span className={isCorrect ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{answers[i] || "(Skipped)"}</span></p>
                  {!isCorrect && <p className="text-sm font-medium"><span className="text-gray-400">Correct Answer:</span> <span className="text-green-600 font-bold underline">{q.answer}</span></p>}
                </div>
              )}

              {q.explanation && (
                <div className="mt-5 p-4 rounded-xl bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800">
                  <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} /> AI Analysis & Explanation
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic font-medium">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 pb-20">
        <button onClick={() => setStep("config")} className="btn-primary justify-center py-3.5 shadow-xl hover:scale-105 transition-transform">
          <RotateCcw size={20} /> New Quiz
        </button>
        <button onClick={exportToExcel} className="btn-secondary justify-center py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xl hover:scale-105 transition-transform">
          <FileSpreadsheet size={20} /> Export to Excel
        </button>
        <button onClick={() => window.print()} className="btn-secondary justify-center py-3.5 shadow-xl hover:scale-105 transition-transform">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Print Report
        </button>
      </div>
    </div>
  );

  return null;
}
