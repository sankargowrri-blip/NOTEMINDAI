"use client";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Sparkles, Loader2, ArrowLeft, Mail } from "lucide-react";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-gray-950 to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <Sparkles className="text-brand-400" size={28} />
            <span className="text-2xl font-bold">NoteMind AI</span>
          </Link>
        </div>
        <div className="card bg-white/5 border-white/10 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Mail className="text-green-400" size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="text-gray-400 text-sm">
                If <strong className="text-white">{email}</strong> is registered, a reset link has been sent. Valid for 60 minutes.
              </p>
              <Link href="/login" className="btn-primary w-full justify-center mt-4 block text-center">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Forgot password?</h2>
              <p className="text-gray-400 text-sm mb-6">Enter your email and we&apos;ll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label text-gray-300">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input bg-white/10 border-white/20 text-white placeholder-gray-500"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "Send Reset Link"}
                </button>
              </form>
              <Link href="/login" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mt-6 justify-center transition-colors">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
