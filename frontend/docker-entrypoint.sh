#!/bin/sh
set -e

if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  # Codespaces forwards each port to its own hostname; the backend's
  # literal "localhost:8000" is not reachable from the browser there.
  API_BASE_URL="https://${CODESPACE_NAME}-8000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8000}"
fi

echo "Configuring frontend to call backend at: $API_BASE_URL"
sed -i "s#__RUNTIME_API_BASE_URL__#$API_BASE_URL#g" /app/dist/config.js

exec serve -s dist -l 4173
