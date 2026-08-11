"use client";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useStudyTracker } from "@/lib/useStudyTracker";
import {
  FileText, Brain, Clock, Target, BookOpen, Zap, TrendingUp, HardDrive
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
  useStudyTracker(); // Automatically track session on dashboard
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const stats = [
    { label: "Total Notes", value: analytics?.total_notes ?? 0, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Study Hours (30d)", value: `${analytics?.study_hours_last_30_days ?? 0}h`, icon: Clock, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
    { label: "Quiz Score Avg", value: `${analytics?.avg_quiz_score ?? 0}%`, icon: Target, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950" },
    { label: "Pages Processed", value: analytics?.total_pages_uploaded ?? 0, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950" },
    { label: "OCR Accuracy", value: `${Math.round((analytics?.avg_ocr_accuracy ?? 0) * 100)}%`, icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" },
    { label: "Storage Limit", value: "2 GB", icon: HardDrive, color: "text-brand-500", bg: "bg-brand-50 dark:bg-brand-950" },
  ];

  const storageUsed = analytics?.storage_used_mb ?? 0;
  const storageQuota = analytics?.storage_quota_mb ?? 2048;
  const storagePercentage = Math.min((storageUsed / storageQuota) * 100, 100);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.display_name} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Ready for today&apos;s study session?</p>
        </div>

        {/* Storage Bar */}
        <div className="w-full md:w-64 space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <span>Storage Usage</span>
                <span>{(storageUsed / 1024).toFixed(2)} GB / 2 GB</span>
            </div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div
                    className={`h-full transition-all duration-500 ${storagePercentage > 90 ? 'bg-red-500' : 'bg-brand-500'}`}
                    style={{ width: `${storagePercentage}%` }}
                />
            </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 hover:shadow-md transition-shadow">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${s.bg} mb-3 shadow-sm`}>
              <s.icon className={s.color} size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLoading ? "—" : s.value}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-tight text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 shadow-sm border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-brand-500" />
            <h2 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">Weekly Study Activity</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={mockWeeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#4f58ff"
                fill="url(#colorHours)"
                strokeWidth={3}
              />
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f58ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f58ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 shadow-sm border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <Target size={18} className="text-brand-500" />
            <h2 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">Weak Topics</h2>
          </div>
          {analytics?.weak_topics?.length ? (
            <div className="space-y-4">
              {analytics.weak_topics.slice(0, 5).map((t: { topic: string; avg_score: number }) => (
                <div key={t.topic} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{t.topic}</span>
                    <span className="font-bold text-red-500">{Math.round(t.avg_score)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 opacity-70" style={{ width: `${t.avg_score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
                <Zap className="text-gray-200 dark:text-gray-800" size={40} />
                <p className="text-gray-400 text-xs italic px-4">No weak topics yet. Take a quiz to analyze your performance!</p>
            </div>
          )}
        </div>
      </div>

      {/* Subjects */}
      {analytics?.subjects_covered?.length > 0 && (
        <div className="card p-5 shadow-sm border-white/5">
          <h2 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs mb-4">Subjects Covered</h2>
          <div className="flex flex-wrap gap-2">
            {analytics.subjects_covered.map((s: string) => (
              <span key={s} className="px-4 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-xs font-bold border border-brand-100 dark:border-brand-800">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
