"use client";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Sparkles, Loader2, ArrowLeft, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSecurityQuestion(res.data.security_question);
      setStep("reset");
      toast.success("Account found! Please answer your security question.");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "No account found with that email.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer || !newPassword) return toast.error("Please fill in all fields");
    if (newPassword.length < 8) return toast.error("New password must be at least 8 characters");

    setLoading(true);
    try {
      await authApi.localResetPassword({
        email,
        security_answer: answer,
        new_password: newPassword
      });
      toast.success("Password reset successful! Redirecting...");
      setTimeout(() => window.location.href = "/login", 2000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Incorrect answer. Please try again.";
      toast.error(msg);
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

        <div className="card bg-white/5 border-white/10 p-8 shadow-2xl">
          {step === "email" ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Account Recovery</h2>
              <p className="text-gray-400 text-sm mb-6">Enter your email to verify your identity.</p>
              <form onSubmit={handleFetchQuestion} className="space-y-4">
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
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "Find Account"}
                </button>
              </form>
              <Link href="/login" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mt-6 justify-center transition-colors">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2 text-brand-400">
                <ShieldCheck size={20} />
                <h2 className="text-xl font-bold text-white">Identity Check</h2>
              </div>
              <p className="text-gray-400 text-sm mb-6">Answer your secret question to set a new password.</p>

              <form onSubmit={handleLocalReset} className="space-y-5">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Your Secret Question</p>
                  <p className="text-white font-medium">{securityQuestion}</p>
                </div>

                <div>
                  <label className="label text-gray-300">Your Answer</label>
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Case-insensitive answer"
                    className="input bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div className="pt-2 border-t border-white/10">
                  <label className="label text-gray-300">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="input bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <span className="flex items-center gap-2">
                        <KeyRound size={18} /> Reset Password
                    </span>
                  )}
                </button>
              </form>
              <button
                onClick={() => setStep("email")}
                className="text-gray-500 hover:text-white text-xs mt-6 w-full text-center transition-colors"
              >
                Use a different email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
