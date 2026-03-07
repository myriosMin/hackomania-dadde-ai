from __future__ import annotations

import argparse

from google import genai
from google.genai import types

from common import get_vision_model, load_image_bytes, require_env


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini vision example from local image")
    parser.add_argument("--image", required=True, help="Path to local image file")
    parser.add_argument(
        "--prompt",
        default="Describe this image in detail and list any visible signs of damage or hazard.",
        help="Instruction for image analysis",
    )
    args = parser.parse_args()

    api_key = require_env("GOOGLE_API_KEY")
    model = get_vision_model()
    image_bytes, mime_type = load_image_bytes(args.image)

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=[
            args.prompt,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
    )

    print(f"model={model}")
    print(f"image={args.image} ({mime_type})")
    print("---")
    print(response.text)


if __name__ == "__main__":
    main()
