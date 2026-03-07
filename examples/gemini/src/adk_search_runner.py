from __future__ import annotations

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import google_search
from google.genai import types

from common import get_adk_model, require_env


def extract_final_text(events) -> str:
    for event in reversed(events):
        if event.is_final_response() and event.content and event.content.parts:
            return "\n".join(part.text for part in event.content.parts if hasattr(part, "text") and part.text)
    return ""


async def run_adk_query(query: str) -> str:
    require_env("GOOGLE_API_KEY")

    root_agent = Agent(
        name="search_assistant",
        model=get_adk_model(),
        description="Agent that can web search and summarize findings",
        instruction=(
            "Use google_search to gather up-to-date information and provide concise bullet points. "
            "Include dates where relevant."
        ),
        tools=[google_search],
    )

    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name="gemini_adk_examples", user_id="demo_user")

    runner = Runner(agent=root_agent, app_name="gemini_adk_examples", session_service=session_service)
    content = types.Content(role="user", parts=[types.Part(text=query)])

    events = []
    async for event in runner.run_async(
        user_id="demo_user",
        session_id=session.id,
        new_message=content,
    ):
        events.append(event)

    return extract_final_text(events)
