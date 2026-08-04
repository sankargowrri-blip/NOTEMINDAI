"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { aiApi, notesApi } from "@/lib/api";
import { BookOpen, Loader2, ChevronDown, ChevronUp, Sparkles, AlertCircle } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

interface Question {
  question: string;
  marks: number;
  outline: string[];
}

function BigQuestionsContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note");

  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(noteId ? Number(noteId) : null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await notesApi.list();
        const notesList = res.data?.notes || (Array.isArray(res.data) ? res.data : []);
        setNotes(notesList);

        // If no note selected yet, select the first one available
        if (!selectedNoteId && notesList && notesList.length > 0) {
          setSelectedNoteId(notesList[0]?.id || null);
        }
      } catch (e) {
        console.error("Failed to fetch notes", e);
      }
    };
    fetchNotes();
  }, [selectedNoteId]);

  const generate = async () => {
    if (!selectedNoteId) {
      toast.error("Please select a note first");
      return;
    }
    setLoading(true);
    setQuestions([]);
    try {
      const res = await aiApi.bigQuestions(selectedNoteId);
      const data = res.data?.questions || [];
      setQuestions(Array.isArray(data) ? data : []);
      if (data.length === 0) {
        toast("No questions generated. The note may be too short.", { icon: "ℹ️" });
      }
    } catch (e) {
      console.error("Failed to generate questions", e);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in px-2 md:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-brand-600" size={24} />
            Big Question Bank
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            University-style 10-16 mark questions with structured outlines.
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

      {!loading && (!questions || questions.length === 0) && (
        <div className="card p-12 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
            <Sparkles size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ready for your exam?</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-1 text-sm">
              Select a note and click Generate to see high-probability long-form questions.
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
        {Array.isArray(questions) && questions.map((q, i) => (
          <div key={i} className="card overflow-hidden transition-all duration-300">
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

            <div className={clsx(
              "px-6 pb-6 space-y-4 transition-all",
              expandedIndex === i ? "block" : "hidden"
            )}>
              <div className="h-px bg-gray-100 dark:bg-gray-800" />
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
            </div>
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
