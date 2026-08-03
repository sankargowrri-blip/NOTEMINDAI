import axios from "axios";

// Absolute URL for production to ensure 100% connectivity.
// No more "relative path" confusion.
const API_BASE = "https://notemind-api-tmsd.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
});

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (body: { email: string; display_name: string; password: string; role?: string }) =>
    api.post("/api/auth/register", body),
  login: (body: { email: string; password: string }) =>
    api.post("/api/auth/login", body),
  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }),
};

// ── Notes ─────────────────────────────────────────────────────────────────────
export const notesApi = {
  list: (params?: Record<string, unknown>) => api.get("/api/notes/", { params }),
  get: (id: number) => api.get(`/api/notes/${id}`),
  update: (id: number, body: Record<string, unknown>) => api.patch(`/api/notes/${id}`, body),
  delete: (id: number) => api.delete(`/api/notes/${id}`),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  upload: (formData: FormData) =>
    api.post("/api/upload/", formData, { headers: { "Content-Type": "multipart/form-data" } }),
};

// ── AI Assistant ──────────────────────────────────────────────────────────────
export const aiApi = {
  chat: (question: string, noteId?: number) =>
    api.post("/api/ai/chat", { question, note_id: noteId }),
  summary: (noteId: number, mode: string) =>
    api.post("/api/ai/summary", { note_id: noteId, mode }),
  simplify: (noteId: number, level: string) =>
    api.post("/api/ai/simplify", { note_id: noteId, level }),
  keywords: (noteId: number) =>
    api.post("/api/ai/keywords", { note_id: noteId }),
  mindMap: (noteId: number) =>
    api.post("/api/ai/mind-map", { note_id: noteId }),
  flowchart: (noteId: number) =>
    api.post("/api/ai/flowchart", { note_id: noteId }),
  examPredict: (noteId: number, weakTopics: string[]) =>
    api.post("/api/ai/exam-predict", { note_id: noteId, weak_topics: weakTopics }),
};

// ── Quiz ──────────────────────────────────────────────────────────────────────
export const quizApi = {
  generate: (body: { note_id: number; question_type: string; difficulty: string; count: number }) =>
    api.post("/api/quiz/generate", body),
  get: (id: number) => api.get(`/api/quiz/${id}`),
  submit: (quizId: number, answers: unknown[]) =>
    api.post("/api/quiz/submit", { quiz_id: quizId, answers }),
};

// ── Flashcards ────────────────────────────────────────────────────────────────
export const flashcardsApi = {
  generate: (body: { note_id: number; card_type: string; count: number }) =>
    api.post("/api/flashcards/generate", body),
  get: (id: number) => api.get(`/api/flashcards/${id}`),
  recall: (setId: number, cardIndex: number, known: boolean) =>
    api.post("/api/flashcards/recall", { set_id: setId, card_index: cardIndex, known }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => api.get("/api/analytics/dashboard"),
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportApi = {
  download: (noteId: number, fmt: string) =>
    api.get(`/api/export/${noteId}/${fmt}`, { responseType: "blob" }),
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string, mode: string = "keyword") =>
    api.get("/api/search/", { params: { q, mode } }),
};

// ── Translation ───────────────────────────────────────────────────────────────
export const translateApi = {
  translate: (noteId: number, targetLanguage: string) =>
    api.post("/api/translate/", { note_id: noteId, target_language: targetLanguage }),
};

// ── Voice ─────────────────────────────────────────────────────────────────────
export const voiceApi = {
  tts: (text: string) => api.post("/api/voice/tts", { text }, { responseType: "blob" }),
  transcribe: (audioBlob: Blob) => {
    const fd = new FormData();
    fd.append("file", audioBlob, "audio.webm");
    return api.post("/api/voice/transcribe", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};
