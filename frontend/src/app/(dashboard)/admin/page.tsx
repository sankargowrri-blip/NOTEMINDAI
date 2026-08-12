"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Shield, Users, Database, Zap, Loader2, Ban, CheckCircle, Trash2 } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get("/api/admin/dashboard").then((r) => r.data),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/api/admin/users").then((r) => r.data),
  });

  const suspendUser = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/users/${id}/suspend`),
    onSuccess: () => { toast.success("User suspended"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const activateUser = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/users/${id}/activate`),
    onSuccess: () => { toast.success("User activated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const purgeData = useMutation({
    mutationFn: () => api.post("/api/admin/purge-data"),
    onSuccess: () => {
      toast.success("System data purged successfully");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => { toast.error("Purge failed. Check server logs."); }
  });

  if (dashLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="text-red-500" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        </div>

        <button
          onClick={() => {
            if (confirm("DANGER: Are you sure you want to delete ALL user-generated data (notes, quizzes, etc.)? This cannot be undone.")) {
              purgeData.mutate();
            }
          }}
          disabled={purgeData.isPending}
          className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs"
        >
          {purgeData.isPending ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
          Purge System Data
        </button>
      </div>

      {/* System stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Users", value: dash?.total_users, icon: Users, color: "text-blue-500" },
          { label: "Active Users", value: dash?.active_users, icon: CheckCircle, color: "text-green-500" },
          { label: "Total Notes", value: dash?.total_notes, icon: Database, color: "text-purple-500" },
          { label: "Storage Used", value: `${dash?.total_storage_gb}GB`, icon: Database, color: "text-orange-500" },
          { label: "OCR Accuracy", value: `${Math.round((dash?.avg_ocr_accuracy ?? 0) * 100)}%`, icon: Zap, color: "text-brand-500" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <s.icon className={`${s.color} mb-2`} size={20} />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value ?? "—"}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Users</h2>
        </div>
        {usersLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-500" size={24} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["ID", "Name", "Email", "Role", "Storage", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {usersData?.users?.map((u: {
                  id: number; display_name: string; email: string; role: string;
                  storage_used_mb: number; storage_quota_mb: number; is_active: boolean;
                }) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-gray-500">#{u.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.display_name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3"><span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">{u.role}</span></td>
                    <td className="px-4 py-3 text-gray-500">{u.storage_used_mb?.toFixed(0)}MB / {u.storage_quota_mb}MB</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <button onClick={() => suspendUser.mutate(u.id)} className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1">
                          <Ban size={12} /> Suspend
                        </button>
                      ) : (
                        <button onClick={() => activateUser.mutate(u.id)} className="text-green-500 hover:text-green-700 text-xs font-medium flex items-center gap-1">
                          <CheckCircle size={12} /> Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
