"use client";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  FileText, Brain, BarChart3, Clock, Target, BookOpen, Zap, TrendingUp
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const mockWeeklyData = [
  { day: "Mon", hours: 1.5 }, { day: "Tue", hours: 2 }, { day: "Wed", hours: 0.5 },
  { day: "Thu", hours: 3 }, { day: "Fri", hours: 2.5 }, { day: "Sat", hours: 1 }, { day: "Sun", hours: 4 },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const stats = [
    { label: "Total Notes", value: analytics?.total_notes ?? 0, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Study Hours (30d)", value: analytics?.study_hours_last_30_days ?? 0, icon: Clock, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
    { label: "Quiz Score Avg", value: `${analytics?.avg_quiz_score ?? 0}%`, icon: Target, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950" },
    { label: "Pages Uploaded", value: analytics?.total_pages_uploaded ?? 0, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950" },
    { label: "OCR Accuracy", value: `${Math.round((analytics?.avg_ocr_accuracy ?? 0) * 100)}%`, icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" },
    { label: "Subjects Covered", value: analytics?.subjects_covered?.length ?? 0, icon: Brain, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.display_name} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Here&apos;s your study overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${s.bg} mb-3`}>
              <s.icon className={s.color} size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLoading ? "—" : s.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Weekly Study Activity</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockWeeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="hours" stroke="#4f58ff" fill="#4f58ff22" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Weak Topics</h2>
          </div>
          {analytics?.weak_topics?.length ? (
            <ul className="space-y-2">
              {analytics.weak_topics.slice(0, 6).map((t: { topic: string; avg_score: number }) => (
                <li key={t.topic} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{t.topic}</span>
                  <span className="badge bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 ml-2">
                    {Math.round(t.avg_score)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No weak topics identified yet. Take some quizzes!</p>
          )}
        </div>
      </div>

      {/* Subjects */}
      {analytics?.subjects_covered?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Subjects Covered</h2>
          <div className="flex flex-wrap gap-2">
            {analytics.subjects_covered.map((s: string) => (
              <span key={s} className="badge bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full text-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
