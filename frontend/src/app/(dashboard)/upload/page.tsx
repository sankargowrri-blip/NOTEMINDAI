"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, FileImage, FileText, X, Loader2, CheckCircle } from "lucide-react";
import { uploadApi } from "@/lib/api";

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  noteId?: number;
  error?: string;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "fr", label: "French" },
  { value: "multi", label: "Multi-language" },
];

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [language, setLanguage] = useState("en");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((f) => ({ file: f, status: "pending" as const }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png"], "application/pdf": [".pdf"] },
    maxSize: 20 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!files.length) return toast.error("Please add at least one file");
    setUploading(true);
    const lastNoteId: number[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, status: "uploading" } : x));
      try {
        const formData = new FormData();
        formData.append("file", f.file);
        formData.append("language", language);
        formData.append("subject", subject);
        formData.append("semester", semester);
        formData.append("title", f.file.name.replace(/\.[^.]+$/, ""));
        const res = await uploadApi.upload(formData);
        lastNoteId.push(res.data.note_id);
        setFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, status: "done", noteId: res.data.note_id } : x));
        if (res.data.no_text_detected) {
          toast("No text detected. Try a clearer photo with better lighting.", { icon: "⚠️" });
        } else if (res.data.low_confidence_warning) {
          toast("Note uploaded! Some text may be inaccurate — check the note and edit if needed.", { icon: "ℹ️" });
        } else {
          toast.success(`Note uploaded successfully!`);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed";
        if (status === 409) {
          // Duplicate — treat as success since the note already exists
          setFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, status: "done" } : x));
          toast("This file already exists in your notes. Opening existing note.", { icon: "ℹ️" });
        } else {
          setFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, status: "error", error: msg } : x));
          toast.error(msg);
        }
      }
    }

    setUploading(false);
    if (lastNoteId.length > 0) {
      toast.success(`${lastNoteId.length} note(s) uploaded successfully!`);
      setTimeout(() => router.push("/notes"), 1500);
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Notes</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Upload images or PDFs — AI will enhance and digitise them automatically.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
            : "border-gray-300 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 text-gray-400" size={40} />
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {isDragActive ? "Drop files here..." : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-sm text-gray-400 mt-1">JPG, JPEG, PNG, PDF • Max 20 MB per file</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 card p-5">
        <div>
          <label className="label">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Subject (optional)</label>
          <input placeholder="e.g. Physics" value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Semester (optional)</label>
          <input placeholder="e.g. Sem 5" value={semester} onChange={(e) => setSemester(e.target.value)} className="input" />
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">
            Files ({files.length})
          </h3>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              {f.file.type === "application/pdf" ? (
                <FileText size={20} className="text-red-500 flex-shrink-0" />
              ) : (
                <FileImage size={20} className="text-blue-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.file.name}</p>
                <p className="text-xs text-gray-400">{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <div className="flex items-center gap-2">
                {f.status === "uploading" && <Loader2 className="animate-spin text-brand-500" size={18} />}
                {f.status === "done" && <CheckCircle className="text-green-500" size={18} />}
                {f.status === "error" && <span className="text-xs text-red-500">{f.error}</span>}
                {f.status === "pending" && (
                  <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full justify-center py-3">
          {uploading ? (
            <><Loader2 className="animate-spin" size={18} /> Processing...</>
          ) : (
            <><Upload size={18} /> Upload & Process {pendingCount} file{pendingCount > 1 ? "s" : ""}</>
          )}
        </button>
      )}
    </div>
  );
}
