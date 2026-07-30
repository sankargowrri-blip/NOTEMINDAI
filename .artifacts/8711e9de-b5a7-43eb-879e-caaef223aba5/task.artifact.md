# Task List - Fix Backend Deployment

- `[ ]` Fix Backend Dependencies
    - `[ ]` Add `asyncpg` to `requirements.txt`
    - `[ ]` Add CPU-optimized `torch` and `easyocr`
- `[ ]` Restore Infrastructure Files
    - `[ ]` Restore `backend/Dockerfile`
    - `[ ]` Create `backend/railway.json`
- `[ ]` Execute Deployment
    - `[ ]` Run `railway up` from the `backend` folder
    - `[ ]` Monitor logs for successful startup
- `[ ]` Verify Frontend Connection
    - `[ ]` Check /health endpoint
    - `[ ]` Verify Vercel Frontend talks to Railway Backend
