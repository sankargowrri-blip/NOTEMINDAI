"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { notesApi } from "@/lib/api";
import { FileText, Star, Calendar, Loader2, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => notesApi.list({ limit: 50 }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted");
    },
    onError: () => toast.error("Failed to delete note"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  const notes = data?.notes || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{notes.length} notes</p>
        </div>
        <Link href="/upload" className="btn-primary"><Plus size={18} /> Upload New</Link>
      </div>

      {notes.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="mx-auto mb-4 text-gray-300" size={48} />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No notes yet</h3>
          <p className="text-gray-400 text-sm mb-6">Upload your first handwritten note to get started.</p>
          <Link href="/upload" className="btn-primary">Upload Note</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note: {
            id: number; title: string; subject?: string; ocr_confidence?: number;
            page_count: number; is_favourite: boolean; created_at: string; status: string;
          }) => (
            <div key={note.id} className="relative group">
              <Link href={`/notes/${note.id}`}>
                <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-950 flex items-center justify-center">
                        <FileText size={18} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      {note.is_favourite && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                    </div>
                    <span className={`badge text-xs px-2 py-0.5 rounded-full ${
                      note.status === "ready"
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                    }`}>
                      {note.status}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 mb-1">
                    {note.title}
                  </h3>

                  {note.subject && (
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium mb-2">{note.subject}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                    <span>{note.page_count} page{note.page_count > 1 ? "s" : ""}</span>
                    {note.ocr_confidence && (
                      <span className={note.ocr_confidence < 0.7 ? "text-red-400" : "text-green-400"}>
                        {Math.round(note.ocr_confidence * 100)}% OCR
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm(`Delete "${note.title}"?`)) {
                    deleteMutation.mutate(note.id);
                  }
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5 z-10"
                title="Delete note"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
