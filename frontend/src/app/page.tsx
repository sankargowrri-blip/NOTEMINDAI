"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain, Upload, Search, MessageSquare, BookOpen, BarChart3,
  Sparkles, FileText, Zap, Globe
} from "lucide-react";

const features = [
  { icon: Upload, title: "Smart Upload", desc: "Drag & drop images or PDFs. AI enhances them before OCR." },
  { icon: Zap, title: "Instant OCR", desc: "TrOCR + EasyOCR extracts text from any handwriting style." },
  { icon: Brain, title: "AI Assistant", desc: "Chat with your notes using RAG. Get answers grounded in your content." },
  { icon: FileText, title: "Auto Summaries", desc: "50-word, detailed, bullet, or revision summaries in one click." },
  { icon: BookOpen, title: "Quiz & Flashcards", desc: "Generate MCQs, fill-in-the-blanks, true/false, and more." },
  { icon: Search, title: "Semantic Search", desc: "Find notes by meaning, not just keywords." },
  { icon: BarChart3, title: "Study Analytics", desc: "Track progress, quiz scores, weak topics, and study hours." },
  { icon: Globe, title: "Multi-Language", desc: "OCR and translation for English, Tamil, Hindi, French, and more." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-gray-950 to-gray-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-400" size={28} />
          <span className="text-xl font-bold tracking-tight">NoteMind AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Sign In</Link>
          <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/20 text-brand-300 text-sm font-medium mb-6">
            <Sparkles size={14} /> AI-Powered Study Assistant
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Turn Handwritten Notes Into<br />
            <span className="text-brand-400">Intelligent Digital Docs</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
            NoteMind AI uses Computer Vision, OCR, and LLMs to digitise your notes, organise them intelligently,
            and help you study smarter with summaries, quizzes, flashcards, and an AI chatbot grounded in your own content.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="btn-primary px-8 py-3 text-base">Start for Free</Link>
            <Link href="/login" className="btn-secondary px-8 py-3 text-base bg-white/10 text-white hover:bg-white/20 border border-white/20">
              Sign In
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need to study smarter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card bg-white/5 border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors"
            >
              <f.icon className="text-brand-400 mb-3" size={24} />
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-20 px-6">
        <h2 className="text-3xl font-bold mb-4">Ready to transform how you study?</h2>
        <p className="text-gray-400 mb-8">Join students and teachers who use NoteMind AI every day.</p>
        <Link href="/register" className="btn-primary px-10 py-3 text-base">Create Free Account</Link>
      </section>

      <footer className="text-center py-8 text-gray-600 text-sm border-t border-white/5">
        © 2025 NoteMind AI — Built for 3rd-Year AI & Data Science Major Project
      </footer>
    </div>
  );
}
