"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";

const schema = z.object({
  display_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "teacher"]),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "student" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.register(data);
      toast.success("Account created! Please verify your email then sign in.");
      router.push("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed";
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
          <p className="text-gray-400 mt-2">Create your free account</p>
        </div>

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
      </div>
    </div>
  );
}
