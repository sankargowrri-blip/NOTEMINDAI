"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { aiApi } from "@/lib/api";
import { Brain, Send, Loader2, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const PROMPT_MODES = [
  "Explain this chapter",
  "Explain in simple language",
  "Generate examples",
  "What are the important topics?",
  "Give interview questions",
  "List all formulas",
  "Compare the main concepts",
];

export default function AIChatPage() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI study assistant. Ask me anything about your uploaded notes, or use one of the quick prompts below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question?: string) => {
    const q = question || input.trim();
    if (!q) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await aiApi.chat(q, noteId ? Number(noteId) : undefined);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer, sources: res.data.sources },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="text-brand-600" size={24} />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Study Assistant</h1>
        {noteId && (
          <span className="badge bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 ml-2">
            Note #{noteId}
          </span>
        )}
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 flex-wrap mb-4">
        {PROMPT_MODES.map((p) => (
          <button key={p} onClick={() => send(p)} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-100 dark:hover:bg-brand-900 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "assistant" ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
            }`}>
              {msg.role === "assistant" ? <Sparkles size={16} className="text-white" /> : <User size={16} className="text-gray-600 dark:text-gray-300" />}
            </div>
            <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : ""}`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  : "bg-brand-600 text-white"
              }`}>
                {msg.content}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <p className="text-xs text-gray-400 mt-1 ml-2">
                  Sources: Note #{msg.sources.join(", #")}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
              <Loader2 className="animate-spin text-brand-500" size={18} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about your notes..."
          className="input flex-1"
          disabled={loading}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary px-4">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
