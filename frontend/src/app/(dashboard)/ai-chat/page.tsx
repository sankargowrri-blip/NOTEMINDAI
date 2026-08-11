"use client";
import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { aiApi, notesApi } from "@/lib/api";
import { useStudyTracker } from "@/lib/useStudyTracker";
import { Brain, Send, Loader2, User, Sparkles, Mic, MicOff, Volume2, VolumeX, Bookmark, RefreshCw, ArrowDown, Trash2 } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  is_web?: boolean;
}

const PROMPT_MODES = [
  "Explain this chapter",
  "Summarize key points",
  "Give real-world examples",
  "Important topics for exam",
  "List formulas",
  "Doubt: How does this work?",
];

function AIChatContent() {
  const searchParams = useSearchParams();
  const urlNoteId = searchParams.get("note");
  useStudyTracker(urlNoteId ? Number(urlNoteId) : undefined); // Track AI Assistant study

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(urlNoteId ? Number(urlNoteId) : null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  // Smart Auto-scroll: Only scroll if user is already at the bottom
  const scrollToBottom = useCallback((force = false) => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 150;

      if (force || isAtBottom) {
        scrollRef.current.scrollTo({ top: scrollHeight, behavior: "smooth" });
      }
    }
  }, []);

  // Monitor scroll position to show/hide "Jump to bottom" button
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 200;
      setShowScrollButton(!isNearBottom);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    const saved = localStorage.getItem("ai_chat_muted");
    if (saved !== null) setIsMuted(saved === "true");

    const fetchNotes = async () => {
      try {
        const res = await notesApi.list();
        const list = res.data?.notes || [];
        setNotes(list);
        if (!activeNoteId && list.length > 0) setActiveNoteId(list[0].id);
      } catch (e) {
        console.error("Failed to fetch notes", e);
      }
    };
    fetchNotes();
  }, [activeNoteId]);

  useEffect(() => {
    localStorage.setItem("ai_chat_muted", String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await aiApi.history();
        if (Array.isArray(res.data) && res.data.length > 0) {
          const lastSession = res.data[0];
          setMessages(lastSession.messages || []);
          setSessionId(lastSession.session_id);
        } else {
          setMessages([{
            role: "assistant",
            content: "Hi! I'm your NoteMind V2 study assistant. I can explain your notes, search the web for doubts, and help you prepare for exams with concise answers. Pick a note below and let's start!",
          }]);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    loadHistory();

    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = "en-US";

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        send(transcript);
      };

      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  const speak = (text: string) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Remove prefixes from audio
      const cleanText = text.replace(/\[Notes\]|\[Web\]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed", e);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      setIsListening(true);
      try {
        recognition.current?.start();
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const handleBookmark = async (content: string) => {
    if (!sessionId) return;
    try {
      await aiApi.bookmark(sessionId, content, activeNoteId || undefined);
      toast.success("Saved to bookmarks!");
    } catch {
      toast.error("Failed to bookmark");
    }
  };

  const send = async (question?: string) => {
    const q = question || input.trim();
    if (!q) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await aiApi.chat(q, activeNoteId || undefined, sessionId);
      const answer = res.data?.answer || "I'm sorry, I couldn't process that.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
          sources: res.data?.sources,
          is_web: res.data?.is_web
        },
      ]);
      setSessionId(res.data?.session_id);
      speak(answer);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Clear this conversation? This will remove all old diagram blocks.")) {
      setMessages([{
        role: "assistant",
        content: "Conversation cleared. I am now in NoteMind V2 (Wise Assistant) mode. How can I help you study?",
      }]);
      setSessionId(undefined);
      toast.success("Chat history cleared!");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-5xl mx-auto w-full animate-fade-in px-2 md:px-4 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Brain className="text-brand-600" size={24} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">NoteMind AI Assistant (V2)</h1>

          <select
            value={activeNoteId || ""}
            onChange={(e) => setActiveNoteId(Number(e.target.value))}
            className="ml-2 text-xs py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-brand-500"
          >
            <option value="">No note selected</option>
            {notes.map(n => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end">
          {isSpeaking && (
             <div className="flex gap-1 items-center mr-2">
                <span className="w-1 h-3 bg-brand-500 animate-bounce"></span>
                <span className="w-1 h-4 bg-brand-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-3 bg-brand-500 animate-bounce [animation-delay:-0.3s]"></span>
             </div>
          )}
          <button
            onClick={() => isSpeaking ? stopSpeaking() : setIsMuted(!isMuted)}
            className={clsx(
              "p-2 rounded-lg transition-all border shadow-sm",
              isSpeaking
                ? "bg-brand-50 border-brand-200 text-brand-600 animate-pulse"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 border-transparent bg-white dark:bg-gray-900"
            )}
            title={isSpeaking ? "Stop Voice" : (isMuted ? "Unmute Assistant" : "Mute Assistant")}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button
            onClick={handleClearHistory}
            className="p-2 rounded-lg transition-all border border-transparent hover:bg-red-50 dark:hover:bg-red-950 text-gray-500 hover:text-red-600"
            title="Clear Chat History"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {PROMPT_MODES.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="whitespace-nowrap text-[10px] md:text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Area - Only this scrolls */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-6 pb-4 scroll-smooth pr-1 custom-scrollbar"
      >
        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
              msg.role === "assistant" ? "bg-brand-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
            )}>
              {msg.role === "assistant" ? <Sparkles size={18} /> : <User size={18} />}
            </div>
            <div className={clsx("max-w-[85%] md:max-w-[75%]", msg.role === "user" ? "flex flex-col items-end" : "")}>
              <div className={clsx(
                "rounded-2xl px-4 py-3 text-sm md:text-base leading-relaxed shadow-sm prose dark:prose-invert max-w-none",
                msg.role === "assistant"
                  ? "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  : "bg-brand-600 text-white"
              )}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              <div className="flex items-center justify-between w-full mt-2 px-1 text-[10px]">
                <div className="flex items-center gap-2">
                  {msg.is_web && (
                    <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                      Web Source
                    </span>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <p className="text-gray-400 font-medium">
                      Source: {activeNoteId ? "Selected Note" : "Notes"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {msg.role === "assistant" && (
                    <>
                      <button
                        onClick={() => speak(msg.content)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-600 transition-colors"
                        title="Replay Audio"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => handleBookmark(msg.content)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-600 transition-colors"
                        title="Bookmark"
                      >
                        <Bookmark size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Jump to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 p-2 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-all animate-bounce z-20"
          title="Jump to latest"
        >
          <ArrowDown size={20} />
        </button>
      )}

      {/* Input */}
      <div className="mt-2 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg mb-2 relative z-10">
        <div className="flex gap-2 items-center">
          <button
            onClick={toggleListening}
            className={clsx(
              "p-3 rounded-xl transition-all shadow-sm",
              isListening
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-brand-600"
            )}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={isListening ? "Listening..." : "Ask me anything (V2 Wise Mode)..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 text-sm md:text-base py-2 px-1"
            disabled={loading}
          />

          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-all shadow-md active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" /></div>}>
      <AIChatContent />
    </Suspense>
  );
}
