"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Sparkles, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      router.push("/login");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      await authApi.resetPassword({ token: token!, new_password: password });
      setSuccess(true);
      toast.success("Password reset successful!");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to reset password. The link may have expired.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="text-green-400" size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">Password Updated</h2>
        <p className="text-gray-400 text-sm">
          Your password has been reset successfully. Redirecting you to sign in...
        </p>
        <Link href="/login" className="btn-primary w-full justify-center mt-4 inline-block text-center">
          Go to Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Set new password</h2>
        <p className="text-gray-400 text-sm">Choose a strong password you haven&apos;t used before.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label text-gray-300">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            className="input bg-white/10 border-white/20 text-white placeholder-gray-500"
            required
          />
        </div>
        <div>
          <label className="label text-gray-300">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="input bg-white/10 border-white/20 text-white placeholder-gray-500"
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
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-400" /></div>}>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
