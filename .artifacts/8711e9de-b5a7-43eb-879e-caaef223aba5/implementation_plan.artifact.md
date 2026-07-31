# Implementation Plan - Final Fix for Registration and Loading

The "Registration failed" issue is likely due to missing environment variables and a strict CORS policy that is blocking the browser's "handshake" with the server.

## Identified Issues
1.  **Missing Secrets**: The latest `render.yaml` update accidentally removed the definitions for `GROQ_API_KEY`, `MONGO_URL`, and `POSTGRES_URL`. This causes the backend to default to local settings, which don't work in the cloud.
2.  **CORS Handshake**: The Preflight (OPTIONS) request is being canceled. We need a more permissive CORS setup for production to ensure browsers don't block the data.
3.  **Database Connection**: Ensure the server uses the `asyncpg` driver explicitly for Render's PostgreSQL.

## Proposed Changes

### 1. Infrastructure
- **[MODIFY] [render.yaml](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/render.yaml)**
    - Restore all environment variables (`GROQ_API_KEY`, `MONGO_URL`, `POSTGRES_URL`, `SECRET_KEY`, etc.).
    - Ensure they are correctly linked to the database.

### 2. Backend Security
- **[MODIFY] [main.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/main.py)**
    - Re-enable `allow_credentials=True`.
    - Explicitly list the Vercel production URL and localhost for development.
    - Add a `GET /` health check that matches what Render's load balancer expects.

### 3. Database
- **[MODIFY] [postgres.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/db/postgres.py)**
    - Ensure `postgres://` is correctly converted to `postgresql+asyncpg://`.

## Verification Plan
1.  Push the fix.
2.  User clicks "Manual Deploy" -> "Clear Cache and Deploy".
3.  Verify the **Environment** tab on Render shows all keys are present.
4.  Test Registration on the Vercel link.
