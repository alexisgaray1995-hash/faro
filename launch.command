#!/bin/bash
# Faro — double-click launcher (macOS) to evaluate the production PWA.
# Builds the app (so the offline service worker is generated) and serves it,
# then opens your browser. Close this window to stop the server.

set -e
cd "$(dirname "$0")"

PORT=3007
URL="http://localhost:${PORT}"

echo "🪔  Faro — preparando la evaluación…"
echo

# Install dependencies on first run.
if [ ! -d node_modules ]; then
  echo "📦  Instalando dependencias (solo la primera vez)…"
  npm install
  echo
fi

echo "🏗️   Compilando build de producción (genera el service worker offline)…"
npm run build
echo

# Open the browser once the server is up.
( sleep 3 && open "${URL}" ) &

echo "🚀  Sirviendo Faro en ${URL}"
echo "    (Ciérralo con Ctrl+C o cerrando esta ventana)"
echo
exec npm run start -- --port "${PORT}"
