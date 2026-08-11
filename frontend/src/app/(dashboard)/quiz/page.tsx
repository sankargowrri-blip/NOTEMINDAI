"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notesApi, quizApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useStudyTracker } from "@/lib/useStudyTracker";
import toast from "react-hot-toast";
import { BookOpen, Loader2, ChevronRight, CheckCircle, XCircle, RotateCcw, AlertCircle, FileSpreadsheet, FileText, MinusCircle, User } from "lucide-react";
import clsx from "clsx";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const QUESTION_TYPES = ["mcq", "fill_blank", "true_false", "one_word", "descriptive", "viva", "placement"];
const DIFFICULTIES = ["easy", "medium", "hard"];

interface Question {
  question: string;
  answer: string;
  explanation?: string;
  options?: Record<string, string>;
}

export default function QuizPage() {
  const { user } = useAuthStore();
  useStudyTracker(); // Track study time during quiz session

  const [step, setStep] = useState<"config" | "quiz" | "result">("config");
  const [noteId, setNoteId] = useState("");
  const [qType, setQType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<{ quiz_id: number; title: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{
      score: number; total: number; percentage: number; student_name: string;
      correct: number; wrong: number; unanswered: number; max_marks: number;
  } | null>(null);

  const { data: notesData } = useQuery({
    queryKey: ["notes-list"],
    queryFn: () => notesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const normalize = (text: string) => {
    return String(text)
      .toLowerCase()
      .replace(/^[a-d][.)\s-]+/, "")
      .replace(/^(the|a|an)\s+/, "")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getCorrectKey = (q: Question) => {
    if (!q.answer) return null;
    const correctStr = String(q.answer).trim().toUpperCase();

    // 1. Direct letter match (A, B, C, D)
    if (q.options && q.options[correctStr]) return correctStr;

    // 2. Normalize and check letter prefix (e.g. "A. Option Text")
    const firstChar = correctStr.charAt(0);
    if ("ABCD".includes(firstChar) && (correctStr.length === 1 || ". )".includes(correctStr.charAt(1)))) {
        return firstChar;
    }

    // 3. Fuzzy Text match (match option text inside answer string)
    if (q.options) {
      const normCorrect = normalize(q.answer);
      for (const [key, value] of Object.entries(q.options)) {
        const normVal = normalize(value);
        if (normVal !== "" && (normVal === normCorrect || normCorrect.includes(normVal) || normVal.includes(normCorrect))) {
          return key;
        }
      }
    }
    return null;
  };

  const generateQuiz = async () => {
    if (!noteId) return toast.error("Please select a note");
    setLoading(true);
    try {
      const res = await quizApi.generate({ note_id: Number(noteId), question_type: qType, difficulty, count });
      setQuiz(res.data);
      setAnswers({});
      setStep("quiz");
    } catch (e: any) {
        const msg = e.response?.data?.detail || "AI is currently busy. Please try with fewer questions.";
        toast.error(msg);
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
      const ck = getCorrectKey(q);
      const uk = answers[i];
      const isCorrect = uk && ck && uk === ck;
      return {
        "No": i + 1,
        "Question": q.question,
        "Options": q.options ? Object.entries(q.options).map(([k, v]) => `${k}: ${v}`).join(" | ") : "N/A",
        "Your Answer": uk || "Skipped",
        "Correct Answer": ck || q.answer,
        "Result": isCorrect ? "CORRECT (+1)" : (uk ? "WRONG (-1)" : "UNANSWERED (0)"),
        "Explanation": q.explanation || ""
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Report");
    XLSX.writeFile(workbook, `${quiz.title}_Report.xlsx`);
    toast.success("Excel report downloaded!");
  };

  const exportToPDF = () => {
    if (!quiz || !result) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(79, 88, 255);
    doc.text("NoteMind AI — Quiz Report", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Student: ${result.student_name}`, 14, 30);
    doc.text(`Topic: ${quiz.title}`, 14, 37);
    doc.text(`Final Score: ${result.score} / ${result.total}`, 14, 44);
    doc.text(`Accuracy: ${result.percentage}%`, 14, 51);

    const tableData = quiz.questions.map((q, i) => {
      const ck = getCorrectKey(q);
      const uk = answers[i];
      const isCorrect = uk && ck && uk === ck;
      return [
        i + 1,
        q.question,
        uk || "-",
        ck || q.answer,
        isCorrect ? "CORRECT (+1)" : (uk ? "WRONG (-1)" : "SKIPPED")
      ];
    });

    autoTable(doc, {
      startY: 60,
      head: [['#', 'Question', 'Your Choice', 'Correct Answer', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 88, 255] },
      styles: { fontSize: 8 }
    });

    doc.save(`${quiz.title}_Report.pdf`);
    toast.success("PDF report downloaded!");
  };

  if (step === "config") return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in px-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Quiz</h1>
        <p className="text-gray-500 text-sm mt-1">Create a quiz from your notes with professional marking (+1/-1)</p>
      </div>
      <div className="card p-6 space-y-5 shadow-lg">
        <div>
          <label className="label font-semibold">Select Note</label>
          <select value={noteId} onChange={(e) => setNoteId(e.target.value)} className="input">
            <option value="">— Choose a note —</option>
            {notesData?.notes?.map((n: { id: number; title: string }) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label font-semibold">Question Type</label>
            <select value={qType} onChange={(e) => setQType(e.target.value)} className="input capitalize">
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label font-semibold">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input capitalize">
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label font-semibold">Number of Questions: <span className="text-brand-600">{count}</span></label>
          <input type="range" min={5} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-brand-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
        </div>
        <button onClick={generateQuiz} disabled={loading} className="btn-primary w-full justify-center py-3.5 shadow-md">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <><BookOpen size={20} /> Generate Quiz</>}
        </button>
      </div>
    </div>
  );

  if (step === "quiz" && quiz) return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20 px-2">
      <div className="flex items-center justify-between sticky top-0 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md py-4 z-10">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-4">{quiz.title}</h1>
        <span className="badge bg-brand-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">{difficulty}</span>
      </div>
      {quiz.questions.map((q, i) => (
        <div key={i} className="card p-6 shadow-sm border hover:border-brand-300 transition-colors">
          <p className="font-bold text-gray-900 dark:text-white text-lg mb-4 leading-snug">{i + 1}. {q.question}</p>
          {q.options ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(q.options).map(([k, v]) => (
                <label key={k} className={clsx(
                  "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                  answers[i] === k
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-4 ring-brand-500/10"
                    : "border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-900"
                )}>
                  <input type="radio" name={`q${i}`} value={k} checked={answers[i] === k} onChange={() => setAnswers({ ...answers, [i]: k })} className="w-5 h-5 accent-brand-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><strong>{k}.</strong> {v}</span>
                </label>
              ))}
            </div>
          ) : (
            <input placeholder="Your answer..." value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} className="input py-3" />
          )}
        </div>
      ))}
      <button onClick={submitQuiz} className="btn-primary w-full justify-center py-4 text-lg font-bold shadow-xl hover:scale-[1.02] transition-transform">
        Finish & Submit <ChevronRight size={22} />
      </button>
    </div>
  );

  if (step === "result" && result && quiz) return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-6 px-2 pb-20">
      <div className="card p-10 text-center space-y-4 shadow-2xl border-t-8 border-t-brand-500">
        <div className={`w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center text-white shadow-lg border-8 border-white/20 ${result.score >= (result.total / 2) ? "bg-green-500" : "bg-red-500"}`}>
            <span className="text-4xl font-black">{result.score}</span>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">MARKS</span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-2 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
              <User size={14} className="text-brand-500" /> Student: {result.student_name}
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">Exam Results</h2>
          <div className="flex items-center justify-center gap-6 mt-4">
              <div className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={18}/> {result.correct} Correct</div>
              <div className="text-red-600 font-bold flex items-center gap-1"><XCircle size={18}/> {result.wrong} Wrong</div>
              <div className="text-gray-500 font-bold flex items-center gap-1"><MinusCircle size={18}/> {result.unanswered} Skipped</div>
          </div>
        </div>
        <div className="pt-4">
            <div className="text-brand-600 font-black text-4xl">{result.percentage}%</div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Accuracy Grade</p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black text-gray-900 dark:text-white px-1 uppercase tracking-tight">Question Review</h3>

        {quiz.questions.map((q, i) => {
          const correctKey = getCorrectKey(q);
          const userKey = answers[i];
          const isCorrect = userKey && correctKey && userKey === correctKey;
          const isWrong = userKey && userKey !== correctKey;

          return (
            <div key={i} className={clsx(
              "card p-8 border-l-[10px] transition-all shadow-md",
              isCorrect ? "border-l-green-500 bg-green-50/10" :
              isWrong ? "border-l-red-500 bg-red-50/10" : "border-l-gray-300 bg-gray-50/10"
            )}>
              <div className="flex items-start justify-between gap-6 mb-6">
                <div className="space-y-1">
                    <p className="text-gray-900 dark:text-white text-xl font-bold leading-snug">{i + 1}. {q.question}</p>
                    <div className="flex items-center gap-2">
                        {isCorrect && <span className="text-green-600 font-black text-[10px] uppercase bg-green-100 px-2 py-0.5 rounded">✓ Correct (+1 Mark)</span>}
                        {isWrong && <span className="text-red-600 font-black text-[10px] uppercase bg-red-100 px-2 py-0.5 rounded">✗ Wrong (-1 Mark)</span>}
                        {!userKey && <span className="text-gray-400 font-black text-[10px] uppercase bg-gray-100 px-2 py-0.5 rounded">○ Unanswered (0 Marks)</span>}
                    </div>
                </div>
                {isCorrect ? <CheckCircle className="text-green-500 shrink-0" size={32} /> :
                 isWrong ? <XCircle className="text-red-500 shrink-0" size={32} /> : null}
              </div>

              {q.options ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(q.options).map(([k, v]) => {
                    const isRightAnswer = k === correctKey;
                    const isUserChoice = userKey === k;

                    return (
                      <div key={k} className={clsx(
                        "p-5 rounded-2xl border-2 text-sm font-bold transition-all flex items-center justify-between",
                        isRightAnswer ? "bg-green-100 border-green-500 text-green-900 shadow-sm" :
                        isUserChoice && !isCorrect ? "bg-red-100 border-red-500 text-red-900" :
                        "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 opacity-60"
                      )}>
                        <span>{k}. {v}</span>
                        {isRightAnswer && <CheckCircle className="text-green-600" size={18} />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl border-2 border-dashed bg-gray-50 dark:bg-black/20">
                  <p className="text-sm font-bold">Your Answer: <span className={isCorrect ? "text-green-600" : "text-red-600"}>{answers[i] || "(Skipped)"}</span></p>
                  {!isCorrect && <p className="text-sm font-bold text-green-600 mt-2">Correct Answer: {q.answer}</p>}
                </div>
              )}

              {/* Enhanced Explanation Section */}
              <div className="mt-8 p-6 rounded-2xl bg-brand-50/50 dark:bg-brand-900/10 border-2 border-brand-100 dark:border-brand-800 relative">
                  <div className="absolute -top-3 left-6 bg-brand-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">AI TUTOR EXPLANATION</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold italic">
                      {isCorrect ? `Excellent! ${q.explanation}` :
                       isWrong ? `The correct answer is ${correctKey || q.answer}. ${q.explanation}` :
                       `You skipped this. The correct answer was ${correctKey || q.answer}. ${q.explanation}`}
                  </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-8 pb-24">
        <button onClick={() => setStep("config")} className="flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-black shadow-xl hover:scale-[1.03] transition-all">
          <RotateCcw size={20} /> RETAKE EXAM
        </button>
        <button onClick={exportToExcel} className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl hover:scale-[1.03] transition-all border-none">
          <FileSpreadsheet size={20} /> EXCEL REPORT
        </button>
        <button onClick={exportToPDF} className="flex items-center justify-center gap-2 bg-brand-600 text-white py-4 rounded-2xl font-black shadow-xl hover:scale-[1.03] transition-all border-none">
          <FileText size={20} /> PDF REPORT
        </button>
      </div>
    </div>
  );

  return null;
}
