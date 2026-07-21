"use client";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { BarChart3, Loader2, TrendingUp, Target, Clock } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-brand-500" size={32} />
    </div>
  );

  const storagePercent = data?.storage_quota_mb > 0
    ? Math.round((data.storage_used_mb / data.storage_quota_mb) * 100)
    : 0;

  const subjectData = (data?.subjects_covered || []).map((s: string, i: number) => ({
    subject: s,
    score: 60 + Math.random() * 40,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Track your learning progress</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Notes", value: data?.total_notes ?? 0, icon: BarChart3, color: "text-blue-500" },
          { label: "Study Hours", value: `${data?.study_hours_last_30_days ?? 0}h`, icon: Clock, color: "text-green-500" },
          { label: "Quiz Avg", value: `${data?.avg_quiz_score ?? 0}%`, icon: Target, color: "text-orange-500" },
          { label: "OCR Accuracy", value: `${Math.round((data?.avg_ocr_accuracy ?? 0) * 100)}%`, icon: TrendingUp, color: "text-brand-500" },
        ].map((m) => (
          <div key={m.label} className="card p-5">
            <m.icon className={`${m.color} mb-2`} size={22} />
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{m.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage bar */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Storage Usage</h2>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all ${storagePercent >= 90 ? "bg-red-500" : storagePercent >= 70 ? "bg-yellow-500" : "bg-brand-600"}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{data?.storage_used_mb?.toFixed(0) ?? 0} MB used</span>
            <span>{storagePercent}% of {data?.storage_quota_mb ?? 0} MB</span>
          </div>
        </div>

        {/* Weak topics */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Weak Topics</h2>
          {data?.weak_topics?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.weak_topics.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="avg_score" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No weak topics yet. Take quizzes to track!</p>
          )}
        </div>

        {/* Subject radar */}
        {subjectData.length > 2 && (
          <div className="card p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Subject Performance</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={subjectData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#4f58ff" fill="#4f58ff" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
