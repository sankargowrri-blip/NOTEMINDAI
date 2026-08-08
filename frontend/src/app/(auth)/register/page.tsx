"use client";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles, Loader2, HelpCircle } from "lucide-react";
import { authApi } from "@/lib/api";

const QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the model of your first car?",
  "In what city were you born?",
  "What was your childhood nickname?",
  "What is the name of your favorite teacher?",
];

const schema = z.object({
  display_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "teacher"]),
  security_question: z.string().min(5, "Please select a question"),
  security_answer: z.string().min(1, "Answer is required"),
});

type FormData = z.infer<typeof schema>;

function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "student", security_question: QUESTIONS[0] },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.register(data);
      toast.success("Account created successfully!");
      router.push("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-white/5 border-white/10 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label text-gray-300">Full Name</label>
          <input placeholder="Your Name" className="input bg-white/10 border-white/20 text-white placeholder-gray-500" {...register("display_name")} />
          {errors.display_name && <p className="text-red-400 text-xs mt-1">{errors.display_name.message}</p>}
        </div>

        <div>
          <label className="label text-gray-300">Email</label>
          <input type="email" placeholder="you@example.com" className="input bg-white/10 border-white/20 text-white placeholder-gray-500" {...register("email")} />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label text-gray-300">Password</label>
          <input type="password" placeholder="••••••••" className="input bg-white/10 border-white/20 text-white placeholder-gray-500" {...register("password")} />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3 text-brand-400">
            <HelpCircle size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Password Recovery Setup</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label text-gray-400 text-[10px] uppercase">Security Question</label>
              <select className="input bg-white/10 border-white/20 text-white" {...register("security_question")}>
                {QUESTIONS.map(q => <option key={q} value={q} className="bg-gray-900">{q}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-gray-400 text-[10px] uppercase">Your Secret Answer</label>
              <input placeholder="Secret Answer" className="input bg-white/10 border-white/20 text-white placeholder-gray-500" {...register("security_answer")} />
              {errors.security_answer && <p className="text-red-400 text-xs mt-1">{errors.security_answer.message}</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="label text-gray-300">I am a...</label>
          <div className="grid grid-cols-2 gap-3">
            {(["student", "teacher"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-white/20 hover:border-brand-400 transition-colors">
                <input type="radio" value={r} {...register("role")} className="text-brand-500" />
                <span className="text-white capitalize">{r}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Account"}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign In</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-gray-950 to-gray-900 p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <Sparkles className="text-brand-400" size={28} />
            <span className="text-2xl font-bold">NoteMind AI</span>
          </Link>
          <p className="text-gray-400 mt-2">Create your free account</p>
        </div>

        <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-400" /></div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
