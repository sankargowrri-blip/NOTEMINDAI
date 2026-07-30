# Implementation Plan - Fix Backend Deployment Errors

The goal is to resolve the backend build and runtime errors on Railway to provide a fully functional public link.

## Identified Issues
1.  **Missing Database Driver**: `asyncpg` is missing from `requirements.txt`, causing the FastAPI app to crash on startup when connecting to PostgreSQL.
2.  **AI Dependency Bloat**: Heavy AI libraries (EasyOCR/Torch) were partially removed or incorrectly configured, leading to potential import errors or build failures.
3.  **Deployment Path Confusion**: Railway was trying to build the entire monorepo as a single app instead of focusing on the `backend` folder.

## Proposed Changes

### 1. Backend Dependencies
- **[MODIFY] [requirements.txt](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/requirements.txt)**
    - Add `asyncpg` (Required for PostgreSQL Async connection).
    - Add `torch` and `torchvision` (CPU-only versions) to enable AI features without exceeding memory limits.
    - Add `easyocr` back.

### 2. Infrastructure Configuration
- **[RESTORE] [Dockerfile](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/Dockerfile)**
    - Ensure it uses the optimized start command: `CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]`.
- **[NEW] [railway.json](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/railway.json)**
    - Explicitly tell Railway to use the Docker builder.

### 3. Deployment Strategy
- Run `railway up` directly from the `backend` folder to ensure clean context.

## Verification Plan
1.  Deploy the backend and monitor build logs for "Success".
2.  Access `https://diligent-vision-production-93f3.up.railway.app/health`.
3.  Test Login on the Frontend to verify end-to-back communication.
