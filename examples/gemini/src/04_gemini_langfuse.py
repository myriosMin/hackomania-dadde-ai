from __future__ import annotations

import argparse

from google import genai
from langfuse import get_client

from common import get_text_model, langfuse_is_configured, require_env


def _usage_dict(response) -> dict[str, int]:
    usage = getattr(response, "usage_metadata", None)
    if usage is None:
        return {}

    data = {}
    for key in ["prompt_token_count", "candidates_token_count", "total_token_count"]:
        value = getattr(usage, key, None)
        if isinstance(value, int):
            data[key] = value
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini text call traced with Langfuse")
    parser.add_argument(
        "--prompt",
        default="Propose a scoring rubric to prioritize disaster aid requests fairly.",
        help="Prompt to send to Gemini",
    )
    args = parser.parse_args()

    api_key = require_env("GOOGLE_API_KEY")
    if not langfuse_is_configured():
        raise RuntimeError("Langfuse is not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY.")

    model = get_text_model()
    client = genai.Client(api_key=api_key)
    langfuse = get_client()

    with langfuse.start_as_current_observation(
        name="gemini_text_generation",
        as_type="generation",
        input=args.prompt,
        model=model,
    ) as generation:
        response = client.models.generate_content(model=model, contents=args.prompt)
        generation.update(output=response.text, usage_details=_usage_dict(response))

    langfuse.flush()

    print(f"model={model}")
    print("langfuse_trace=sent")
    print("---")
    print(response.text)


if __name__ == "__main__":
    main()
