from __future__ import annotations

import argparse

from google import genai

from common import get_text_model, require_env


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini text generation example")
    parser.add_argument(
        "--prompt",
        default="Give 5 practical ideas to make emergency fund payouts fair and transparent.",
        help="Prompt to send to Gemini",
    )
    args = parser.parse_args()

    api_key = require_env("GOOGLE_API_KEY")
    model = get_text_model()

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(model=model, contents=args.prompt)

    print(f"model={model}")
    print("---")
    print(response.text)


if __name__ == "__main__":
    main()
