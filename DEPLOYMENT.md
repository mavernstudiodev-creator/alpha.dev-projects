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

