"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { aiApi } from "@/lib/api";
import { Brain, Send, Loader2, User, Sparkles, Mic, MicOff, Volume2, VolumeX, Bookmark } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  is_web?: boolean;
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

function AIChatContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Web Speech API
  const recognition = useRef<any>(null);

  useEffect(() => {
    // Load history
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
            content: "Hi! I'm your AI study assistant. Ask me anything about your uploaded notes, or use one of the quick prompts below.",
          }]);
        }
      } catch (e) {
        console.error("Failed to load history", e);
        setMessages([{
          role: "assistant",
          content: "Hi! I'm your AI study assistant. Ask me anything about your uploaded notes, or use one of the quick prompts below.",
        }]);
      }
    };
    loadHistory();

    // Initialize Speech Recognition
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed", e);
    }
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
    if (!sessionId) {
      toast.error("Please start a conversation first");
      return;
    }
    try {
      await aiApi.bookmark(sessionId, content, noteId ? Number(noteId) : undefined);
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
      const res = await aiApi.chat(q, noteId ? Number(noteId) : undefined, sessionId);
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

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-5xl mx-auto w-full animate-fade-in px-2 md:px-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="text-brand-600" size={24} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Study Assistant</h1>
          {noteId && (
            <span className="badge bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 ml-2 text-[10px]">
              Note #{noteId}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {PROMPT_MODES.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform hover:scale-105",
              msg.role === "assistant" ? "bg-brand-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
            )}>
              {msg.role === "assistant" ? <Sparkles size={18} /> : <User size={18} />}
            </div>
            <div className={clsx("max-w-[85%] md:max-w-[75%]", msg.role === "user" ? "flex flex-col items-end" : "")}>
              <div className={clsx(
                "rounded-2xl px-4 py-3 text-sm md:text-base leading-relaxed shadow-sm",
                msg.role === "assistant"
                  ? "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  : "bg-brand-600 text-white"
              )}>
                {msg.content}
              </div>
              <div className="flex items-center justify-between w-full mt-2 px-1">
                <div className="flex items-center gap-2">
                  {msg.is_web && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                      Internet Augmented
                    </span>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <p className="text-[10px] text-gray-400 font-medium">
                      Verified from Notes
                    </p>
                  )}
                </div>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => handleBookmark(msg.content)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-600 transition-colors"
                    title="Bookmark this answer"
                  >
                    <Bookmark size={14} />
                  </button>
                )}
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-2 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg mb-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Ask with voice"}
            className={clsx(
              "p-3 rounded-xl transition-all",
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
            placeholder={isListening ? "Listening..." : "Ask about your notes or the web..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 text-sm md:text-base py-2"
            disabled={loading}
          />

          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors shadow-md"
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
