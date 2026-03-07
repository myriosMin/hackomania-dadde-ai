from __future__ import annotations

import argparse
import asyncio

from adk_search_runner import run_adk_query


def main() -> None:
    parser = argparse.ArgumentParser(description="Google ADK web-search agent with Gemini")
    parser.add_argument(
        "--query",
        default="What are three major disaster preparedness updates in Southeast Asia in the last 12 months?",
        help="Query to run through ADK + google_search",
    )
    args = parser.parse_args()

    answer = asyncio.run(run_adk_query(args.query))
    print("query=", args.query)
    print("---")
    print(answer or "No final answer generated.")


if __name__ == "__main__":
    main()
