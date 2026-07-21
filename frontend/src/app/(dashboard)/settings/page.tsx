"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Settings, User, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: { display_name: user?.display_name || "", password: "" },
  });

  const onSubmit = async (data: { display_name: string; password: string }) => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (data.display_name) body.display_name = data.display_name;
      if (data.password) body.password = data.password;
      await api.patch("/api/users/me", body);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Settings size={22} className="text-gray-600 dark:text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
          <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold">
            {user?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{user?.display_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="badge bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 capitalize text-xs mt-1">
              {user?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input className="input" {...register("display_name")} />
          </div>
          <div>
            <label className="label">New Password (leave blank to keep current)</label>
            <input type="password" className="input" placeholder="••••••••" {...register("password")} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
