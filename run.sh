#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-4000}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting local app on http://localhost:${PORT}"

if command -v netlify >/dev/null 2>&1; then
  exec netlify dev --port "${PORT}"
fi

if command -v npx >/dev/null 2>&1; then
  exec npx netlify dev --port "${PORT}"
fi

echo "Netlify CLI was not found. Falling back to server.js."
export PORT
exec node server.js
