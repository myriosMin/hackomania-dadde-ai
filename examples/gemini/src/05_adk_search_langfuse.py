from __future__ import annotations

import argparse
import asyncio

from langfuse import get_client

from adk_search_runner import run_adk_query
from common import langfuse_is_configured


def main() -> None:
    parser = argparse.ArgumentParser(description="ADK google_search run traced with Langfuse")
    parser.add_argument(
        "--query",
        default="Find 3 best practices for transparent emergency fund payouts, with sources and dates.",
        help="Query to run",
    )
    args = parser.parse_args()

    if not langfuse_is_configured():
        raise RuntimeError("Langfuse is not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY.")

    langfuse = get_client()
    with langfuse.start_as_current_observation(
        name="adk_google_search",
        as_type="agent",
        input=args.query,
        model="gemini_adk",
    ) as obs:
        answer = asyncio.run(run_adk_query(args.query))
        obs.update(output=answer)

    langfuse.flush()

    print("langfuse_trace=sent")
    print("---")
    print(answer or "No final answer generated.")


if __name__ == "__main__":
    main()
