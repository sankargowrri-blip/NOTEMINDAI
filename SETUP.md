# NoteMind AI — Setup Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 15+ |
| MongoDB | 7+ |
| Redis | 7+ |
| Tesseract OCR | 5+ |

---

## 1. Clone / Open the project

```
cd "HANDWRITTEN TO TEXT"
```

---

## 2. Backend Setup

```bash
cd backend

# Copy and edit environment variables
copy .env.example .env
# → Fill in your OpenAI API key, database URLs, Firebase credentials, etc.

# Create a Python virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model (optional, for advanced NLP)
python -m spacy download en_core_web_sm

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## 3. Frontend Setup

```bash
cd frontend

# Copy environment variables
copy .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

App available at: http://localhost:3000

---

## 4. Docker (Full Stack)

```bash
# From project root
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
# Edit both .env files with your keys

docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 5. Key Environment Variables

### Backend `.env`
| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | 256-bit random secret for JWT signing |
| `POSTGRES_URL` | PostgreSQL connection string |
| `MONGO_URL` | MongoDB connection string |
| `OPENAI_API_KEY` | OpenAI API key (GPT + Whisper + TTS) |
| `STORAGE_BACKEND` | `local`, `s3`, or `firebase` |

### Frontend `.env`
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: http://localhost:8000) |

---

## 6. First Run

1. Register an account at http://localhost:3000/register
2. Upload a handwritten note image at /upload
3. Wait for OCR processing (~10-30 seconds per page)
4. Open the note and use AI Chat, Quiz, Flashcards, etc.

---

## 7. Project Structure

```
notemind-ai/
├── backend/
│   ├── app/
│   │   ├── config.py          — App settings (pydantic-settings)
│   │   ├── main.py            — FastAPI app entry point
│   │   ├── db/
│   │   │   ├── postgres.py    — SQLAlchemy async engine
│   │   │   ├── mongo.py       — Motor MongoDB client
│   │   │   └── vector_store.py — ChromaDB RAG vector store
│   │   ├── models/            — SQLAlchemy ORM models
│   │   ├── routers/           — FastAPI route handlers (17 modules)
│   │   └── services/          — Business logic
│   │       ├── image_enhancer.py  — OpenCV image pipeline
│   │       ├── ocr_service.py     — TrOCR / EasyOCR / Tesseract
│   │       ├── text_refiner.py    — LLM-based text correction
│   │       ├── ai_service.py      — RAG chat, summaries, mind maps
│   │       ├── quiz_service.py    — Quiz & flashcard generation
│   │       └── export_service.py  — PDF, DOCX, PPTX, HTML, MD
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx              — Landing page
        │   ├── (auth)/               — Login, Register
        │   └── (dashboard)/          — Protected app pages
        │       ├── dashboard/        — Analytics overview
        │       ├── upload/           — File upload
        │       ├── notes/            — Note list + detail
        │       ├── ai-chat/          — RAG chatbot
        │       ├── quiz/             — Quiz generator
        │       ├── flashcards/       — Flashcard study
        │       ├── search/           — Semantic search
        │       ├── analytics/        — Study analytics
        │       ├── admin/            — Admin panel
        │       └── settings/         — User profile
        ├── components/
        │   ├── Sidebar.tsx
        │   ├── TopBar.tsx
        │   └── Providers.tsx
        └── lib/
            ├── api.ts               — Axios API client
            └── store.ts             — Zustand auth store
```
