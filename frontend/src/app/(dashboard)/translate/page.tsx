"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notesApi, translateApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Globe, Loader2, Copy, Check } from "lucide-react";

const LANGUAGES = [
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
];

export default function TranslatePage() {
  const [noteId, setNoteId] = useState("");
  const [targetLang, setTargetLang] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ original: string; translated: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: notesData } = useQuery({
    queryKey: ["notes-list"],
    queryFn: () => notesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const handleTranslate = async () => {
    if (!noteId) return toast.error("Select a note first");
    setLoading(true);
    try {
      const res = await translateApi.translate(Number(noteId), targetLang);
      setResult(res.data);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  const copyTranslation = () => {
    if (result) {
      navigator.clipboard.writeText(result.translated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedLang = LANGUAGES.find((l) => l.code === targetLang);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Globe className="text-brand-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Translate Notes</h1>
          <p className="text-gray-500 text-sm">AI-powered translation preserving structure and formulas</p>
        </div>
      </div>

      {/* Config */}
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="label">Select Note</label>
            <select value={noteId} onChange={(e) => setNoteId(e.target.value)} className="input">
              <option value="">— Choose a note —</option>
              {notesData?.notes?.map((n: { id: number; title: string }) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Target Language</label>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setTargetLang(l.code)}
                  title={l.name}
                  className={`p-2 rounded-lg border text-lg transition-colors ${
                    targetLang === l.code
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-brand-400"
                  }`}
                >
                  {l.flag}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedLang?.name}</p>
          </div>
          <div className="flex items-end">
            <button onClick={handleTranslate} disabled={loading || !noteId} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Globe size={18} />}
              Translate
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-3 flex items-center gap-2">
              🇬🇧 Original (English)
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
              {result.original}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                {selectedLang?.flag} {selectedLang?.name}
              </h3>
              <button onClick={copyTranslation} className="btn-secondary text-xs py-1 px-2">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
              {result.translated}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
