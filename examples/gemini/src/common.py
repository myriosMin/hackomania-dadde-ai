from __future__ import annotations

import mimetypes
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_text_model() -> str:
    return os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")


def get_vision_model() -> str:
    return os.getenv("GEMINI_VISION_MODEL", "gemini-2.5-flash")


def get_adk_model() -> str:
    return os.getenv("GEMINI_ADK_MODEL", "gemini-2.5-flash")


def load_image_bytes(path_str: str) -> tuple[bytes, str]:
    image_path = Path(path_str)
    if not image_path.exists() or not image_path.is_file():
        raise RuntimeError(f"Image file not found: {path_str}")

    mime_type, _ = mimetypes.guess_type(image_path.name)
    if mime_type is None:
        raise RuntimeError(
            f"Cannot infer MIME type for '{image_path.name}'. Use a common image extension like .jpg/.png."
        )

    return image_path.read_bytes(), mime_type


def langfuse_is_configured() -> bool:
    return bool(os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"))
