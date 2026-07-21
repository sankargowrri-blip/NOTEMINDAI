"use client";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Edit3, Check, X, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  noteId: number;
  text: string;
}

export default function NoteEditor({ noteId, text }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [preview, setPreview] = useState(false);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (newText: string) => notesApi.update(noteId, { formatted_text: newText }),
    onSuccess: () => {
      toast.success("Note saved");
      qc.invalidateQueries({ queryKey: ["note", noteId] });
      setEditing(false);
    },
    onError: () => toast.error("Failed to save"),
  });

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-1.5">
            <Edit3 size={14} /> Edit Note
          </button>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "*No text content*"}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setPreview(false)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${!preview ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
          >
            Write
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${preview ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
          >
            Preview
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setValue(text); setEditing(false); }}
            className="btn-secondary text-sm py-1.5"
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={() => save.mutate(value)}
            disabled={save.isPending}
            className="btn-primary text-sm py-1.5"
          >
            <Save size={14} /> {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="prose dark:prose-invert max-w-none min-h-[300px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full min-h-[400px] p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
          placeholder="Write your note here using Markdown…"
          spellCheck
          autoFocus
        />
      )}
      <p className="text-xs text-gray-400">Supports Markdown — **bold**, *italic*, # headings, - lists, `code`</p>
    </div>
  );
}
