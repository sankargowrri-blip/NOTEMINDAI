"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { aiApi, notesApi } from "@/lib/api";
import { useStudyTracker } from "@/lib/useStudyTracker";
import {
  BookOpen, Loader2, ChevronRight, Sparkles, AlertCircle,
  FileText, Download, RotateCcw, X, Eye, FileBox, CheckCircle
} from "lucide-react";
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
  isGenerating?: boolean;
}

function BigQuestionsContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note");
  useStudyTracker(noteId ? Number(noteId) : undefined);

  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(noteId ? Number(noteId) : null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

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

  const generateQuestions = async () => {
    if (!selectedNoteId) return toast.error("Please select a note");
    setLoading(true);
    setQuestions([]);
    setPreviewIndex(null);
    try {
      const res = await aiApi.bigQuestions(selectedNoteId);
      const data = res.data?.questions || [];
      setQuestions(data.map((q: any) => ({ ...q, isGenerating: false })));
      if (data.length > 0) toast.success("Questions generated!");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const fetchFullAnswer = async (index: number, force = false) => {
    if (!selectedNoteId) return;
    const q = questions[index];
    if (q.full_answer && !force) {
        setPreviewIndex(index);
        return;
    }

    const updated = [...questions];
    updated[index].isGenerating = true;
    setQuestions(updated);
    setPreviewIndex(index);

    try {
      const res = await aiApi.fullAnswer(selectedNoteId, q.question, q.marks, q.outline);
      const final = [...questions];
      final[index].full_answer = res.data.full_answer;
      final[index].isGenerating = false;
      setQuestions(final);
    } catch (e) {
      toast.error("Failed to generate full answer");
      const err = [...questions];
      err[index].isGenerating = false;
      setQuestions(err);
    }
  };

  const generatePDF = async (index: number) => {
    const q = questions[index];
    const note = notes.find(n => n.id === selectedNoteId);

    let answerText = q.full_answer;
    if (!answerText) {
        toast.loading("Generating answer first...");
        const res = await aiApi.fullAnswer(selectedNoteId!, q.question, q.marks, q.outline);
        answerText = res.data.full_answer;
        const final = [...questions];
        final[index].full_answer = answerText;
        setQuestions(final);
        toast.dismiss();
    }

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(79, 88, 255);
    doc.text("NoteMind AI — Exam Study Guide", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Subject/Unit: ${note?.title || "General"}`, 14, 28);
    doc.text(`Marks: ${q.marks} Marks`, 14, 34);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(14);
    doc.setTextColor(33);
    doc.text("Question:", 14, 48);
    doc.setFontSize(11);
    const splitQ = doc.splitTextToSize(q.question, 180);
    doc.text(splitQ, 14, 55);

    let y = 55 + (splitQ.length * 7) + 10;

    doc.setFontSize(14);
    doc.setTextColor(33);
    doc.text("Answer", 14, y);

    doc.setFontSize(10);
    doc.setTextColor(60);
    const cleanText = answerText!.replace(/### /g, "").replace(/\*\*/g, "");
    const splitText = doc.splitTextToSize(cleanText, 180);

    let cursor = y + 8;
    splitText.forEach((line: string) => {
        if (cursor > 280) {
            doc.addPage();
            cursor = 20;
        }
        doc.text(line, 14, cursor);
        cursor += 6;
    });

    doc.save(`NoteMind_Answer_Q${index + 1}.pdf`);
  };

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-brand-600" size={24} />
            Big Question Bank
          </h1>
          <p className="text-xs text-gray-500 font-medium">University-style 10-16 mark questions with structured outlines.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedNoteId || ""}
            onChange={(e) => setSelectedNoteId(Number(e.target.value))}
            className="input py-1.5 text-xs w-48 font-bold"
          >
            <option value="" disabled>Select a note</option>
            {notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
          <button
            onClick={generateQuestions}
            disabled={loading}
            className="btn-primary py-1.5 px-6 text-xs font-black uppercase tracking-widest"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Generate"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-gray-50/50 dark:bg-black/20">

        {/* Left Column: Question Cards */}
        <div className={clsx(
            "lg:col-span-5 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4 space-y-4 custom-scrollbar",
            previewIndex !== null && "hidden lg:block"
        )}>
          {questions.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-3">
              <FileBox size={64} />
              <p className="text-sm font-bold uppercase tracking-widest">Select a note to generate questions</p>
            </div>
          )}

          {questions.map((q, i) => (
            <div
                key={i}
                className={clsx(
                    "card p-6 cursor-pointer transition-all border-2",
                    previewIndex === i ? "border-brand-500 shadow-lg ring-4 ring-brand-500/5 scale-[1.02]" : "hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm"
                )}
                onClick={() => setPreviewIndex(i)}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800 tracking-tighter">
                    {q.marks} Marks
                </span>
                {q.full_answer && <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full"><CheckCircle size={14} className="text-green-600" /></div>}
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight mb-4">
                {q.question}
              </h3>

              <div className="space-y-2 mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                   <AlertCircle size={12} /> Proposed Structure
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {q.outline.slice(0, 3).map((o, idx) => (
                        <span key={idx} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded truncate max-w-[120px]">
                            {idx + 1}. {o}
                        </span>
                    ))}
                    {q.outline.length > 3 && <span className="text-[10px] text-gray-400">+{q.outline.length - 3} more</span>}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                 <button
                    onClick={(e) => { e.stopPropagation(); fetchFullAnswer(i); }}
                    disabled={q.isGenerating}
                    className="flex-1 btn-primary py-2 px-3 text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-1.5"
                 >
                    {q.isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                    {q.full_answer ? "View Preview" : "Preview Full Answer"}
                 </button>
                 <button
                    onClick={(e) => { e.stopPropagation(); generatePDF(i); }}
                    className="btn-secondary py-2 px-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-gray-200"
                 >
                    <Download size={12} /> PDF
                 </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column / Mobile Modal: Full Answer Preview */}
        <div className={clsx(
            "lg:col-span-7 bg-white dark:bg-black/40 flex flex-col h-full",
            previewIndex === null ? "hidden lg:flex items-center justify-center text-gray-400" : "fixed inset-0 z-50 lg:relative lg:z-0 lg:flex"
        )}>
          {previewIndex === null ? (
            <div className="text-center space-y-4 opacity-20">
               <FileText size={80} className="mx-auto" />
               <p className="font-black uppercase text-sm tracking-[0.2em]">Select a question to view full answer</p>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-white dark:bg-gray-950">
              {/* Preview Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setPreviewIndex(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl lg:hidden">
                        <X size={24} />
                    </button>
                    <div className="flex flex-col">
                        <h2 className="font-black text-xs uppercase tracking-[0.15em] text-brand-600">Document Analysis</h2>
                        <h1 className="font-bold text-base text-gray-900 dark:text-white">Full Answer Preview</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchFullAnswer(previewIndex, true)}
                        disabled={questions[previewIndex].isGenerating}
                        className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-colors"
                        title="Regenerate"
                    >
                        <RotateCcw size={20} className={questions[previewIndex].isGenerating ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => generatePDF(previewIndex)}
                        className="p-2.5 hover:bg-brand-50 hover:text-brand-600 rounded-xl text-gray-500 transition-colors"
                        title="Download PDF"
                    >
                        <Download size={20} />
                    </button>
                    <button onClick={() => setPreviewIndex(null)} className="hidden lg:block p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar bg-gray-50/50 dark:bg-black/20">

                <div className="space-y-6 max-w-3xl mx-auto">
                    <span className="text-[11px] font-black uppercase text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-4 py-1.5 rounded-full border border-brand-100 dark:border-brand-800 tracking-widest shadow-sm">
                        {questions[previewIndex].marks} Marks
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-[1.2]">
                        {questions[previewIndex].question}
                    </h1>
                </div>

                <div className="max-w-3xl mx-auto space-y-12">
                    {/* Structure Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">
                            <AlertCircle size={14} className="text-brand-500" />
                            Proposed Structure
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {questions[previewIndex].outline.map((o, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm text-sm font-bold text-gray-700 dark:text-gray-200">
                                    <span className="w-6 h-6 flex-shrink-0 bg-brand-600 text-white flex items-center justify-center rounded-lg text-[10px] shadow-md shadow-brand-500/20">{i+1}</span>
                                    <span className="pt-0.5">{o}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Full Answer Section */}
                    <div className="space-y-6 border-t border-gray-100 dark:border-gray-800 pt-12">
                        <div className="flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">
                            <FileText size={14} className="text-brand-500" />
                            Complete Exam Solution
                        </div>

                        {questions[previewIndex].isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-6">
                                <Loader2 className="animate-spin text-brand-600" size={48} />
                                <div className="text-center space-y-2">
                                    <p className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Generating Answer</p>
                                    <p className="text-xs text-gray-500 font-medium italic">Our AI professor is composing a high-scoring response...</p>
                                </div>
                            </div>
                        ) : questions[previewIndex].full_answer ? (
                            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none bg-white dark:bg-gray-900 p-10 md:p-14 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none leading-relaxed relative">
                                <div className="absolute top-8 right-10 opacity-10">
                                    <Sparkles size={48} className="text-brand-600" />
                                </div>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {questions[previewIndex].full_answer}
                                </ReactMarkdown>

                                <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                                    <button
                                        onClick={() => generatePDF(previewIndex)}
                                        className="btn-primary px-8 py-3 rounded-2xl shadow-xl shadow-brand-500/30 font-black uppercase tracking-widest text-xs"
                                    >
                                        <Download size={18} /> Export Study PDF
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[2.5rem] border-4 border-dashed border-gray-50 dark:border-gray-900 transition-all hover:border-brand-100 dark:hover:border-brand-900/40">
                                <div className="w-20 h-20 bg-brand-50 dark:bg-brand-950 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Sparkles className="text-brand-400" size={40} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Ready to Learn?</h3>
                                <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">Generate a complete, university-style solution for this question based on your notes.</p>
                                <button
                                    onClick={() => fetchFullAnswer(previewIndex)}
                                    className="mt-8 btn-primary px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs"
                                >
                                    Generate Full Answer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BigQuestionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>}>
      <BigQuestionsContent />
    </Suspense>
  );
}
