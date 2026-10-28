// Overwritten at container startup by docker-entrypoint.sh so the API base
// URL can be set per-environment (local Docker, Codespaces, etc.) without
// rebuilding the image. Left as the placeholder in plain `npm run dev`/Vercel
// builds, where src/api/client.ts falls back to VITE_API_BASE_URL instead.
window.__API_BASE_URL__ = "__RUNTIME_API_BASE_URL__";
