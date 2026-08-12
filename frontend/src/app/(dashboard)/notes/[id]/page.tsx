"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { notesApi, aiApi, exportApi } from "@/lib/api";
import { useStudyTracker } from "@/lib/useStudyTracker";
import toast from "react-hot-toast";
import {
  FileText, Brain, BookOpen, Layers, Download, Globe, Star,
  Loader2, ChevronDown, Wand2, Map, GitBranch, Key
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NoteEditor from "@/components/NoteEditor";

type TabKey = "text" | "summary" | "simplify" | "keywords";

const SUMMARY_MODES = ["bullet", "50_word", "100_word", "detailed", "revision"];
const SIMPLIFY_LEVELS = ["school", "child", "engineering"];
const EXPORT_FORMATS = ["pdf", "docx", "txt", "html", "md", "pptx"];

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const noteId = Number(id);
  useStudyTracker(noteId); // Track reading time
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("text");
  const [summaryMode, setSummaryMode] = useState("bullet");
  const [simplifyLevel, setSimplifyLevel] = useState("school");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", noteId],
    queryFn: () => notesApi.get(noteId).then((r) => r.data),
  });

  const toggleFavourite = useMutation({
    mutationFn: () => notesApi.update(noteId, { is_favourite: !note?.is_favourite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note", noteId] }),
  });

  const handleDownload = async (fmt: string) => {
    try {
      const res = await exportApi.download(noteId, fmt);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${note?.title}.${fmt}`;
      a.click();
    } catch {
      toast.error("Export failed");
    }
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      let res;
      if (activeTab === "summary") {
        res = await aiApi.summary(noteId, summaryMode);
        setAiResult(res.data.summary);
      } else if (activeTab === "simplify") {
        res = await aiApi.simplify(noteId, simplifyLevel);
        setAiResult(res.data.simplified);
      } else if (activeTab === "keywords") {
        res = await aiApi.keywords(noteId);
        setAiResult(JSON.stringify(res.data, null, 2));
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "AI request failed";
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>;
  if (!note) return <div className="text-center py-20 text-gray-400">Note not found</div>;

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "text", label: "Text", icon: FileText },
    { key: "summary", label: "Summary", icon: Brain },
    { key: "simplify", label: "Simplify", icon: Wand2 },
    { key: "keywords", label: "Keywords", icon: Key },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{note.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            {note.subject && <span className="text-brand-600 dark:text-brand-400 font-bold uppercase tracking-tighter">{note.subject}</span>}
            {note.unit && <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Unit: {note.unit}</span>}
            {note.chapter && <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Ch: {note.chapter}</span>}
            <span>{note.page_count} page{note.page_count > 1 ? "s" : ""}</span>
            {note.ocr_confidence && <span>OCR: {Math.round(note.ocr_confidence * 100)}%</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => toggleFavourite.mutate()} className="btn-secondary">
            <Star size={16} className={note.is_favourite ? "text-yellow-500 fill-yellow-500" : ""} />
          </button>
          <div className="relative group">
            <button className="btn-secondary"><Download size={16} /> Export <ChevronDown size={14} /></button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[120px]">
              {EXPORT_FORMATS.map((fmt) => (
                <button key={fmt} onClick={() => handleDownload(fmt)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 uppercase font-medium">
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <a href={`/ai-chat?note=${noteId}`} className="btn-primary">
            <Brain size={16} /> Chat with AI
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setAiResult(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === key
                ? "border-brand-600 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card p-6">
        {activeTab === "text" && (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.formatted_text || note.refined_text || note.raw_ocr_text || "*No text extracted yet*"}
            </ReactMarkdown>
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={summaryMode} onChange={(e) => setSummaryMode(e.target.value)} className="input max-w-xs">
                {SUMMARY_MODES.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
              <button onClick={runAI} disabled={aiLoading} className="btn-primary">
                {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />}
                Generate Summary
              </button>
            </div>
            {aiResult && <div className="prose dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown></div>}
          </div>
        )}

        {activeTab === "simplify" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={simplifyLevel} onChange={(e) => setSimplifyLevel(e.target.value)} className="input max-w-xs">
                {SIMPLIFY_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)} Level</option>)}
              </select>
              <button onClick={runAI} disabled={aiLoading} className="btn-primary">
                {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                Simplify
              </button>
            </div>
            {aiResult && <div className="prose dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown></div>}
          </div>
        )}

        {activeTab === "keywords" && (
          <div className="space-y-4">
            <button onClick={runAI} disabled={aiLoading} className="btn-primary">
              {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />}
              Generate Keywords
            </button>
            {aiResult && activeTab === "keywords" && (() => {
              try {
                const data = JSON.parse(aiResult);
                return (
                  <div className="space-y-4">
                    {data.keywords?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {data.keywords.map((k: string) => (
                            <span key={k} className="badge bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full text-sm">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.definitions?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">Definitions</h3>
                        <div className="space-y-2">
                          {data.definitions.map((d: { term: string; definition: string }, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                              <span className="font-medium text-gray-900 dark:text-white">{d.term}</span>
                              <span className="text-gray-500 mx-2">—</span>
                              <span className="text-gray-600 dark:text-gray-400 text-sm">{d.definition}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.formulas?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">Formulas</h3>
                        <div className="space-y-2">
                          {data.formulas.map((f: string, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 font-mono text-sm text-yellow-800 dark:text-yellow-200">{f}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } catch {
                return <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm font-mono overflow-x-auto">{aiResult}</pre>;
              }
            })()}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a href={`/quiz?note=${noteId}`} className="card p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
          <BookOpen className="mx-auto mb-2 text-orange-500 group-hover:scale-110 transition-transform" size={24} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Generate Quiz</p>
        </a>
        <a href={`/flashcards?note=${noteId}`} className="card p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
          <Layers className="mx-auto mb-2 text-purple-500 group-hover:scale-110 transition-transform" size={24} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Flashcards</p>
        </a>
        <a href={`/ai-chat?note=${noteId}`} className="card p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
          <Brain className="mx-auto mb-2 text-brand-500 group-hover:scale-110 transition-transform" size={24} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Chat</p>
        </a>
        <a href={`/translate?note=${noteId}`} className="card p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
          <Globe className="mx-auto mb-2 text-green-500 group-hover:scale-110 transition-transform" size={24} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Translate</p>
        </a>
      </div>
    </div>
  );
}
