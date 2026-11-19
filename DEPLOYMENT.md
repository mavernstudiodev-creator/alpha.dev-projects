# Deployment

## GitHub Pages frontend

The `Deploy CiteVerify frontend to GitHub Pages` workflow builds and publishes the React app when changes are pushed to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The expected project site URL is:

`https://mavernstudiodev-creator.github.io/alpha.dev-projects/`

The workflow accepts a repository Actions variable named `VITE_API_URL`. Set it to the public origin of a running CiteVerify API, without `/api/v1` (for example, `https://api.example.org`).

## Backend requirement

GitHub Pages serves static files and cannot run the FastAPI service. Until the API is hosted on a server, uploads, verification, the assistant, reports, and other API-backed features will report that the API is unreachable. To enable them, deploy this repository's Python service to a backend host and configure its environment variables there:

- `DATABASE_URL` for a persistent database
- `NVIDIA_API_KEY` (optional; keep it server-side)
- `NVIDIA_BASE_URL` and `NVIDIA_MODEL` as needed
- CORS access for `https://mavernstudiodev-creator.github.io`

Then set the GitHub repository Actions variable `VITE_API_URL` to that backend's public origin and rerun the Pages workflow.

## Temporary backend demo on Render

The root `render.yaml` defines a free Render web service for the FastAPI backend. To create it, sign in to Render, choose **New → Blueprint**, connect `mavernstudiodev-creator/alpha.dev-projects` on `main`, and deploy the blueprint. Enter `NVIDIA_API_KEY` in Render's secret prompt (or leave it blank to use the local grounded assistant mode). Do not put the NVIDIA key in GitHub, the frontend, or this file.

After the service deploys, open `https://<your-service>.onrender.com/api/health` and confirm it reports `healthy`. In GitHub, open **Settings → Secrets and variables → Actions → Variables**, create a repository variable named `VITE_API_URL`, and set its value to the service origin, such as `https://citeverify-api.onrender.com` (do not append `/api/v1`). Then run **Actions → Deploy CiteVerify frontend to GitHub Pages → Run workflow** so the frontend is rebuilt with the API URL. The `CORS_ORIGINS` setting in `render.yaml` already permits the GitHub Pages site origin.

This free setup is for demos and testing. Render free web services sleep after 15 minutes without inbound traffic and have an ephemeral filesystem; uploaded PDFs and the SQLite database are lost when the service sleeps, restarts, or redeploys. Use paid persistent storage or external durable database/object storage before relying on it for ongoing work.

