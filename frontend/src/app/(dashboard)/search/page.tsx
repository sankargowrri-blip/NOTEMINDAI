"use client";
import { useState } from "react";
import Link from "next/link";
import { searchApi } from "@/lib/api";
import { Search, FileText, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NoteResult {
  id: number;
  title: string;
  subject?: string;
  created_at: string;
  score?: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("keyword");
  const [results, setResults] = useState<NoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchApi.search(query, mode);
      setResults(res.data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search Notes</h1>
        <p className="text-gray-500 text-sm mt-1">Keyword or semantic AI search across all your notes</p>
      </div>

      {/* Search bar */}
      <div className="card p-5 space-y-4">
        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search your notes..."
            className="input flex-1 text-base"
          />
          <button onClick={handleSearch} disabled={loading} className="btn-primary px-6">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          </button>
        </div>
        <div className="flex gap-2">
          {["keyword", "semantic"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)} Search
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {searched && !loading && (
        <div>
          <p className="text-sm text-gray-500 mb-3">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
          {results.length === 0 ? (
            <div className="card p-12 text-center">
              <Search className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="text-gray-500">No notes matched your search</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <Link key={r.id} href={`/notes/${r.id}`}>
                  <div className="card p-4 hover:shadow-md transition-shadow flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-950 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{r.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        {r.subject && <span className="text-brand-600 dark:text-brand-400">{r.subject}</span>}
                        <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                        {r.score && <span className="text-green-500">{Math.round(r.score * 100)}% match</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
