#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT_DIR"
  echo "Copy .env.example to .env and fill your keys."
  exit 1
fi

# shellcheck disable=SC1091
source .env

if [[ -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "GOOGLE_API_KEY is required in .env"
  exit 1
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt

echo "[1/5] Gemini text"
python src/01_gemini_text.py

echo "[2/5] Gemini vision (local image)"
if [[ -n "${IMAGE_PATH:-}" ]]; then
  python src/02_gemini_vision_local.py --image "$IMAGE_PATH"
else
  echo "Skipping vision example: set IMAGE_PATH in .env"
fi

echo "[3/5] ADK google_search"
python src/03_adk_google_search.py

echo "[4/5] Gemini + Langfuse"
if [[ -n "${LANGFUSE_PUBLIC_KEY:-}" && -n "${LANGFUSE_SECRET_KEY:-}" ]]; then
  python src/04_gemini_langfuse.py
else
  echo "Skipping Langfuse text trace: set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY"
fi

echo "[5/5] ADK google_search + Langfuse"
if [[ -n "${LANGFUSE_PUBLIC_KEY:-}" && -n "${LANGFUSE_SECRET_KEY:-}" ]]; then
  python src/05_adk_search_langfuse.py
else
  echo "Skipping ADK Langfuse trace: set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY"
fi

echo "Done"
