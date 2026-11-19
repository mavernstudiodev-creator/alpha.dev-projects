# CiteVerify

CiteVerify combines a React and TypeScript research workspace with a FastAPI service for PDF claim extraction, citation resolution, evidence retrieval, verification, human review, audit history, report export, and a grounded NVIDIA research assistant.

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer

## Run locally

Install backend dependencies and start the API from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Install and start the frontend in another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000` by default. Set `VITE_API_URL` to the backend origin (for example `https://api.example.org`) when the API is hosted elsewhere. The frontend never needs the NVIDIA key.

## Backend configuration

The API reads `DATABASE_URL`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, and `NVIDIA_MODEL` from the environment. NVIDIA access is optional; the assistant uses the backend's grounded local response mode when no key is configured. Keep these values server-side and out of `frontend/.env*` files.

The interactive API documentation is available at `/docs`, and health is reported at `/api/health`.
