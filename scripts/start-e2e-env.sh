#!/usr/bin/env bash
set -euo pipefail

cat > .env.local <<'EOF'
VITE_USE_EMULATORS=true
VITE_FUNCTIONS_BASE_URL=http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1
VITE_FIREBASE_PROJECT_ID=centro-educativo-f5cc5
EOF

npm run emulators > emulators.log 2>&1 &
EMULATORS_PID=$!

cleanup() {
  kill "$EMULATORS_PID" 2>/dev/null || true
  pkill -f "firebase-tools" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 150); do
  if curl -fsS http://127.0.0.1:9099 >/dev/null 2>&1 \
    && curl -fsS http://127.0.0.1:8080 >/dev/null 2>&1 \
    && curl -fsS http://127.0.0.1:5001 >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

npm run seed:emulators

exec npm run dev -- --host 127.0.0.1 --port 5173
