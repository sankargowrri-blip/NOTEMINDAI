"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notesApi, flashcardsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Layers, Loader2, ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Card { front: string; back: string; }

export default function FlashcardsPage() {
  const [step, setStep] = useState<"config" | "study">("config");
  const [noteId, setNoteId] = useState("");
  const [cardType, setCardType] = useState("standard");
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [setId, setSetId] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);

  const { data: notesData } = useQuery({
    queryKey: ["notes-list"],
    queryFn: () => notesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const generate = async () => {
    if (!noteId) return toast.error("Please select a note");
    setLoading(true);
    try {
      const res = await flashcardsApi.generate({ note_id: Number(noteId), card_type: cardType, count });
      setCards(res.data.cards);
      setSetId(res.data.set_id);
      setCurrent(0);
      setFlipped(false);
      setKnown(0); setUnknown(0);
      setStep("study");
    } catch {
      toast.error("Failed to generate flashcards");
    } finally {
      setLoading(false);
    }
  };

  const recordAndNext = async (isKnown: boolean) => {
    if (setId !== null) {
      await flashcardsApi.recall(setId, current, isKnown).catch(() => {});
    }
    isKnown ? setKnown((k) => k + 1) : setUnknown((u) => u + 1);
    setFlipped(false);
    setTimeout(() => setCurrent((c) => c + 1), 100);
  };

  const card = cards[current];
  const progress = cards.length > 0 ? Math.round((current / cards.length) * 100) : 0;

  if (step === "config") return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flashcard Study</h1>
        <p className="text-gray-500 text-sm mt-1">AI-generated flashcards for active recall</p>
      </div>
      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Select Note</label>
          <select value={noteId} onChange={(e) => setNoteId(e.target.value)} className="input">
            <option value="">— Choose a note —</option>
            {notesData?.notes?.map((n: { id: number; title: string }) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Card Type</label>
          <div className="grid grid-cols-3 gap-2">
            {["standard", "definition", "formula"].map((t) => (
              <button key={t} onClick={() => setCardType(t)} className={`p-3 rounded-lg border text-sm font-medium transition-colors capitalize ${cardType === t ? "border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Number of Cards: {count}</label>
          <input type="range" min={5} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-brand-600" />
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />}
          Generate Flashcards
        </button>
      </div>
    </div>
  );

  if (current >= cards.length) return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-6 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mx-auto flex items-center justify-center">
        <CheckCircle className="text-green-500" size={36} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session Complete!</h2>
      <div className="flex justify-center gap-8">
        <div className="text-center"><div className="text-3xl font-bold text-green-500">{known}</div><div className="text-sm text-gray-400">Known</div></div>
        <div className="text-center"><div className="text-3xl font-bold text-red-500">{unknown}</div><div className="text-sm text-gray-400">Learning</div></div>
      </div>
      <button onClick={() => { setCurrent(0); setFlipped(false); setKnown(0); setUnknown(0); }} className="btn-secondary mx-auto">
        <RotateCcw size={16} /> Study Again
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Flashcards</h1>
        <span className="text-sm text-gray-500">{current + 1} / {cards.length}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div className="bg-brand-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div className="perspective-1000 cursor-pointer" onClick={() => setFlipped(!flipped)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current}-${flipped}`}
            initial={{ rotateY: flipped ? 180 : 0, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`card p-12 text-center min-h-[240px] flex items-center justify-center ${flipped ? "bg-brand-50 dark:bg-brand-950" : ""}`}
          >
            <div>
              <p className="text-xs uppercase font-semibold text-gray-400 mb-4">{flipped ? "Back" : "Front"} — click to flip</p>
              <p className="text-xl font-medium text-gray-900 dark:text-white">
                {flipped ? card.back : card.front}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {flipped && (
        <div className="flex gap-4">
          <button onClick={() => recordAndNext(false)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors font-medium">
            <XCircle size={20} /> Still Learning
          </button>
          <button onClick={() => recordAndNext(true)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors font-medium">
            <CheckCircle size={20} /> Got It!
          </button>
        </div>
      )}
    </div>
  );
}
