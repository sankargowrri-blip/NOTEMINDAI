"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Calendar, Plus, Trash2, Loader2, Clock, BookOpen } from "lucide-react";
import { format, addDays } from "date-fns";

interface FormData {
  subjects: { name: string }[];
  exam_date: string;
  daily_hours: number;
  weak_topics: { name: string }[];
}

interface Session { subject: string; topic: string; duration_minutes: number; }
interface DayPlan { date: string; sessions: Session[]; }

export default function RevisionPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DayPlan[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultExam = format(addDays(new Date(), 14), "yyyy-MM-dd");

  const { register, control, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      subjects: [{ name: "" }],
      exam_date: defaultExam,
      daily_hours: 3,
      weak_topics: [],
    },
  });

  const { fields: subjectFields, append: addSubject, remove: removeSubject } = useFieldArray({ control, name: "subjects" });
  const { fields: weakFields, append: addWeak, remove: removeWeak } = useFieldArray({ control, name: "weak_topics" });

  const onSubmit = async (data: FormData) => {
    const subjects = data.subjects.map((s) => s.name).filter(Boolean);
    if (!subjects.length) return toast.error("Add at least one subject");
    setLoading(true);
    try {
      const res = await api.post("/api/revision/plan", {
        subjects,
        exam_date: data.exam_date,
        daily_hours: data.daily_hours,
        weak_topics: data.weak_topics.map((w) => w.name).filter(Boolean),
      });
      setPlan(res.data.plan || []);
      if (!res.data.plan?.length) toast.error("Could not generate plan. Check your OpenAI API key.");
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const totalSessions = plan.reduce((a, d) => a + d.sessions.length, 0);
  const totalMinutes = plan.reduce((a, d) => a + d.sessions.reduce((b, s) => b + s.duration_minutes, 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Calendar className="text-brand-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Revision Planner</h1>
          <p className="text-gray-500 text-sm">Generate a personalised study schedule for your exam</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-5 lg:col-span-1">
          <div>
            <label className="label">Exam Date</label>
            <input type="date" min={today} className="input" {...register("exam_date")} />
          </div>
          <div>
            <label className="label">Daily Study Hours: {watch("daily_hours")}h</label>
            <input type="range" min={1} max={12} step={0.5} className="w-full accent-brand-600" {...register("daily_hours", { valueAsNumber: true })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Subjects</label>
              <button type="button" onClick={() => addSubject({ name: "" })} className="text-brand-600 hover:text-brand-700 text-sm flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>
            {subjectFields.map((f, i) => (
              <div key={f.id} className="flex gap-2 mb-2">
                <input placeholder="e.g. Mathematics" className="input flex-1 text-sm" {...register(`subjects.${i}.name`)} />
                {subjectFields.length > 1 && (
                  <button type="button" onClick={() => removeSubject(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Weak Topics (optional)</label>
              <button type="button" onClick={() => addWeak({ name: "" })} className="text-brand-600 hover:text-brand-700 text-sm flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>
            {weakFields.map((f, i) => (
              <div key={f.id} className="flex gap-2 mb-2">
                <input placeholder="e.g. Integration" className="input flex-1 text-sm" {...register(`weak_topics.${i}.name`)} />
                <button type="button" onClick={() => removeWeak(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />}
            Generate Plan
          </button>
        </form>

        {/* Plan output */}
        <div className="lg:col-span-2 space-y-4">
          {plan.length > 0 && (
            <>
              <div className="flex gap-4">
                <div className="card p-4 flex-1 text-center">
                  <div className="text-2xl font-bold text-brand-600">{plan.length}</div>
                  <div className="text-xs text-gray-400">Study Days</div>
                </div>
                <div className="card p-4 flex-1 text-center">
                  <div className="text-2xl font-bold text-green-600">{totalSessions}</div>
                  <div className="text-xs text-gray-400">Sessions</div>
                </div>
                <div className="card p-4 flex-1 text-center">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(totalMinutes / 60)}h</div>
                  <div className="text-xs text-gray-400">Total Time</div>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {plan.map((day) => (
                  <div key={day.date} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={16} className="text-brand-500" />
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {format(new Date(day.date + "T00:00:00"), "EEEE, MMM d")}
                      </h3>
                      <span className="text-xs text-gray-400 ml-auto">
                        {day.sessions.reduce((a, s) => a + s.duration_minutes, 0)} min
                      </span>
                    </div>
                    <div className="space-y-2">
                      {day.sessions.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950 flex items-center justify-center flex-shrink-0">
                            <BookOpen size={14} className="text-brand-600 dark:text-brand-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.topic}</p>
                            <p className="text-xs text-brand-600 dark:text-brand-400">{s.subject}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                            <Clock size={12} />
                            {s.duration_minutes}m
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && plan.length === 0 && (
            <div className="card p-16 text-center">
              <Calendar className="mx-auto mb-4 text-gray-300" size={48} />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No plan yet</h3>
              <p className="text-gray-400 text-sm">Fill in the form and generate your personalised revision schedule.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
