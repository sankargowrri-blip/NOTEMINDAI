# NoteMind AI

An intelligent handwritten notes recognition, knowledge management, and AI study assistant platform.

## Stack

- **Frontend**: Next.js 14, Tailwind CSS, TypeScript
- **Backend**: Python, FastAPI
- **AI/ML**: TrOCR, EasyOCR, LangChain, HuggingFace Transformers, OpenAI GPT
- **Database**: PostgreSQL (relational), MongoDB (documents), ChromaDB (vectors)
- **Storage**: Firebase Storage / AWS S3
- **Auth**: Firebase Authentication + JWT
- **Deployment**: Docker, Docker Compose

## Project Structure

```
notemind-ai/
├── frontend/          # Next.js 14 app
├── backend/           # FastAPI Python app
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose

### Development

```bash
# Clone and navigate
cd "HANDWRITTEN TO TEXT"

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Docker (full stack)

```bash
docker-compose up --build
```

## Environment Variables

Copy `.env.example` to `.env` in both `frontend/` and `backend/` and fill in your keys.
