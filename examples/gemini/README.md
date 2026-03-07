# Gemini + ADK + Langfuse Examples

This folder gives runnable examples for:
- Gemini text generation
- Gemini vision (read local image)
- Google ADK agent with `google_search`
- Langfuse tracing for Gemini and ADK runs

## Setup

1. `cd examples/gemini`
2. `cp .env.example .env`
3. Fill at least:
- `GOOGLE_API_KEY`
4. Optional:
- `IMAGE_PATH` for vision test
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` for tracing

## Single-command run

```bash
./run-all.sh
```

This will create a local `.venv`, install dependencies, then run all examples in order.

## Individual examples

```bash
source .venv/bin/activate
python src/01_gemini_text.py --prompt "Summarize payout rules"
python src/02_gemini_vision_local.py --image /absolute/path/to/image.jpg
python src/03_adk_google_search.py --query "Latest flood resilience policies in Singapore"
python src/04_gemini_langfuse.py --prompt "Design a transparent grant workflow"
python src/05_adk_search_langfuse.py --query "Best practices in emergency cash transfer governance"
```

## Notes

- ADK web search uses `google.adk.tools.google_search`.
- Vision example reads local files and sends them as bytes to Gemini.
- Langfuse examples require both public/secret keys.
