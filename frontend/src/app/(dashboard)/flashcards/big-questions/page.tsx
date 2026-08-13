"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { aiApi, notesApi } from "@/lib/api";
import { useStudyTracker } from "@/lib/useStudyTracker";
import { BookOpen, Loader2, ChevronDown, ChevronUp, Sparkles, AlertCircle, FileText, Download } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
  question: string;
  marks: number;
  outline: string[];
  full_answer?: string;
}

function BigQuestionsContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note");
  useStudyTracker(noteId ? Number(noteId) : undefined); // Track question bank study

  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(noteId ? Number(noteId) : null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [answerLoading, setAnswerLoading] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await notesApi.list();
      const notesList = res.data?.notes || (Array.isArray(res.data) ? res.data : []);
      setNotes(notesList);

      if (!selectedNoteId && notesList && notesList.length > 0) {
        setSelectedNoteId(notesList[0]?.id || null);
      }
    } catch (e) {
      console.error("Failed to fetch notes", e);
    }
  }, [selectedNoteId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const fetchFullAnswer = async (index: number) => {
    if (!selectedNoteId) return;
    const q = questions[index];
    if (q.full_answer) return; // Already fetched

    setAnswerLoading(index);
    try {
      const res = await aiApi.fullAnswer(selectedNoteId, q.question, q.marks, q.outline);
      const updatedQuestions = [...questions];
      updatedQuestions[index].full_answer = res.data.full_answer;
      setQuestions(updatedQuestions);
    } catch (e) {
      toast.error("Failed to generate full answer");
    } finally {
      setAnswerLoading(null);
    }
  };

  const generate = async () => {
    if (!selectedNoteId) {
      toast.error("Please select a note first");
      return;
    }
    setLoading(true);
    setQuestions([]);
    setExpandedIndex(null);
    try {
      const res = await aiApi.bigQuestions(selectedNoteId);
      const data = res.data?.questions || [];
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data);
        toast.success("Questions generated!");
      } else {
        toast("No questions generated. The note may be too short or AI is busy.", { icon: "ℹ️" });
      }
    } catch (e: any) {
      console.error("Failed to generate questions", e);
      const msg = e.response?.data?.detail || "AI server is busy. Please try again in a minute.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (q: Question) => {
    if (!q.full_answer) {
        toast.error("Please preview the answer first to generate it.");
        return;
    }
    const doc = new jsPDF();
    const note = notes.find(n => n.id === selectedNoteId);

    // Title & Branding
    doc.setFontSize(22);
    doc.setTextColor(79, 88, 255);
    doc.text("NoteMind AI — Exam Study Guide", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Subject: ${note?.subject || "General"} | Topic: ${note?.title || "N/A"}`, 14, 28);
    doc.line(14, 32, 196, 32);

    // Question Section
    doc.setFontSize(14);
    doc.setTextColor(33);
    const qText = `Question (${q.marks} Marks): ${q.question}`;
    const splitQ = doc.splitTextToSize(qText, 180);
    doc.text(splitQ, 14, 42);

    let yPos = 42 + (splitQ.length * 7);

    // Outline Section
    doc.setFontSize(12);
    doc.setTextColor(79, 88, 255);
    doc.text("Proposed Answer Structure:", 14, yPos + 10);

    doc.setFontSize(10);
    doc.setTextColor(80);
    const outlineData = q.outline.map((item, idx) => [`${idx + 1}.`, item]);
    autoTable(doc, {
      startY: yPos + 14,
      body: outlineData,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1 },
      columnStyles: { 0: { cellWidth: 10 } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Full Answer Section
    doc.setFontSize(12);
    doc.setTextColor(33);
    doc.text("Full Exam-Ready Answer:", 14, yPos);

    doc.setFontSize(10);
    doc.setTextColor(60);
    const answerClean = q.full_answer.replace(/###/g, "").replace(/\*\*/g, "");
    const splitA = doc.splitTextToSize(answerClean, 180);

    // Auto-paging for long answers
    let remainingA = splitA;
    while (remainingA.length > 0) {
        // Calculate how many lines can fit on the current page
        const linesPerPage = Math.floor((280 - (yPos + 10)) / 7);
        const pageLines = remainingA.slice(0, Math.max(linesPerPage, 10));

        doc.text(pageLines, 14, yPos + 10);
        remainingA = remainingA.slice(pageLines.length);

        if (remainingA.length > 0) {
            doc.addPage();
            yPos = 10; // Start near top of new page
        }
    }

    doc.save(`${note?.title || "Study"}_Full_Answer.pdf`);
    toast.success("PDF Downloaded successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in px-2 md:px-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-brand-600" size={24} />
            Big Question Bank
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            University-style long questions with structured outlines and full answers.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedNoteId || ""}
            onChange={(e) => setSelectedNoteId(Number(e.target.value))}
            className="input py-2 text-sm max-w-[200px]"
          >
            <option value="" disabled>Select a note</option>
            {Array.isArray(notes) && notes.filter(n => n && n.id).map(n => (
              <option key={n.id} value={n.id}>{n.title || "Untitled Note"}</option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={loading || !selectedNoteId}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Generate"}
          </button>
        </div>
      </div>

      {!loading && questions.length === 0 && (
        <div className="card p-12 flex flex-col items-center text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
            <Sparkles size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ready for your exam?</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-1 text-sm">
              Select a note and click Generate to see high-probability 16-mark questions.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="card overflow-hidden transition-all duration-300 shadow-sm border hover:border-brand-300 dark:hover:border-brand-700">
            <button
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="w-full text-left p-6 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded border border-brand-100 dark:border-brand-800">
                  {q.marks || 15} Marks
                </span>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white leading-tight">
                  {q.question}
                </h3>
              </div>
              {expandedIndex === i ? <ChevronUp className="text-gray-400 shrink-0" size={20} /> : <ChevronDown className="text-gray-400 shrink-0" size={20} />}
            </button>

            {expandedIndex === i && (
              <div className="px-6 pb-6 space-y-6 animate-slide-up">
                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* Structure */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertCircle size={16} className="text-brand-500" />
                    Proposed Answer Structure:
                  </h4>
                  <ul className="space-y-3">
                    {q.outline?.map((step, si) => (
                      <li key={si} className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[11px] font-bold border border-brand-100 dark:border-brand-800">
                          {si + 1}
                        </span>
                        <p className="pt-0.5">{step}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Full Answer */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={16} className="text-brand-500" />
                        Full Answer
                    </h4>
                    {!q.full_answer && (
                        <button
                            onClick={() => fetchFullAnswer(i)}
                            disabled={answerLoading === i}
                            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg border border-brand-100 dark:border-brand-800"
                        >
                            {answerLoading === i ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                            Preview Full Answer
                        </button>
                    )}
                  </div>

                  {q.full_answer ? (
                    <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 prose prose-sm dark:prose-invert max-w-none shadow-inner">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {q.full_answer}
                        </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="p-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-center">
                        <p className="text-xs text-gray-400 italic">Click preview to generate the complete university-style answer.</p>
                    </div>
                  )}
                </div>

                {/* PDF Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={() => generatePDF(q)}
                        disabled={!q.full_answer}
                        className="btn-primary py-2 px-6 shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:grayscale"
                    >
                        <Download size={18} /> Download PDF
                    </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BigQuestionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" /></div>}>
      <BigQuestionsContent />
    </Suspense>
  );
}
