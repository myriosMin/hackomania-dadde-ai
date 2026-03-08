"""
Dadde's Fund AI Agent – Disaster Verification & Claim Recommendation Pipeline

CopilotKit  ↔  AG-UI-ADK  ↔  Google ADK  (Gemini)

Pipeline (replaces Dual-AI from original PRD):
  DaddesFundAgent  (root orchestrator)
    ├─ DisasterVerifierAgent  — confirms disaster reality via APIs / web / ClickHouse
    └─ ClaimRecommenderAgent  — evaluates claim against community-voted rules

Every LLM call, tool invocation, and pipeline run is traced to **Langfuse** for
full observability.  Combined with ClickHouse audit logging, this gives judges
an immutable, dual-channel transparency trail.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import ToolContext, google_search
from google.genai import types
from pydantic import BaseModel, Field

# ── Environment ──────────────────────────────────────────────────────────────
load_dotenv()  # agent/.env  (GOOGLE_API_KEY)
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)  # root .env

GEMINI_MODEL = os.getenv("GEMINI_ADK_MODEL", "gemini-2.5-flash")


# ═══════════════════════════════════════════════════════════════════════════════
# LANGFUSE OBSERVABILITY LAYER
# ═══════════════════════════════════════════════════════════════════════════════
# Every agent run, LLM generation, and tool call is traced to Langfuse.
# This provides a second observability channel beyond ClickHouse audit logging.

_LANGFUSE_PUBLIC = os.getenv("LANGFUSE_PUBLIC_KEY", "")
_LANGFUSE_SECRET = os.getenv("LANGFUSE_SECRET_KEY", "")
_LANGFUSE_HOST = os.getenv("LANGFUSE_BASE_URL", os.getenv("LANGFUSE_HOST", "https://us.cloud.langfuse.com"))

_langfuse_client = None


def _get_langfuse():
    """Lazily initialise the Langfuse client singleton."""
    global _langfuse_client
    if _langfuse_client is not None:
        return _langfuse_client
    if not (_LANGFUSE_PUBLIC and _LANGFUSE_SECRET):
        return None
    try:
        from langfuse import Langfuse
        _langfuse_client = Langfuse(
            public_key=_LANGFUSE_PUBLIC,
            secret_key=_LANGFUSE_SECRET,
            host=_LANGFUSE_HOST,
        )
        return _langfuse_client
    except Exception as exc:
        print(f"⚠️  Langfuse init failed (non-fatal): {exc}")
        return None


def langfuse_trace(name: str, **kwargs):
    """Create a new Langfuse trace (top-level pipeline run)."""
    lf = _get_langfuse()
    if lf is None:
        return None
    try:
        return lf.trace(name=name, **kwargs)
    except Exception:
        return None


def langfuse_span(trace, name: str, **kwargs):
    """Create a span (sub-step) under a Langfuse trace or span."""
    if trace is None:
        return None
    try:
        return trace.span(name=name, **kwargs)
    except Exception:
        return None


def langfuse_generation(trace, name: str, model: str, input_data=None, **kwargs):
    """Record an LLM generation event under a trace/span."""
    if trace is None:
        return None
    try:
        return trace.generation(
            name=name,
            model=model,
            input=input_data,
            **kwargs,
        )
    except Exception:
        return None


def langfuse_flush():
    """Flush Langfuse events (call at end of request)."""
    lf = _get_langfuse()
    if lf:
        try:
            lf.flush()
        except Exception:
            pass


def langfuse_log_tool(trace, tool_name: str, input_data: Any, output_data: Any, duration_ms: int = 0):
    """Log a tool invocation as a Langfuse span with input/output."""
    if trace is None:
        return
    try:
        span = trace.span(
            name=f"tool:{tool_name}",
            input=input_data if isinstance(input_data, (str, dict, list)) else str(input_data),
            output=output_data if isinstance(output_data, (str, dict, list)) else str(output_data),
            metadata={"duration_ms": duration_ms, "tool": tool_name},
        )
        span.end()
    except Exception:
        pass


def langfuse_log_clickhouse(trace, operation: str, table: str, row_count: int, duration_ms: int):
    """Log a ClickHouse write as a Langfuse span for full audit trail."""
    if trace is None:
        return
    try:
        span = trace.span(
            name=f"clickhouse:{operation}",
            input={"table": table, "rows": row_count},
            metadata={"duration_ms": duration_ms, "operation": operation, "table": table},
        )
        span.end()
    except Exception:
        pass


# Thread-local trace context for callbacks  (simple global for now — single worker)
_current_trace = None


def _set_current_trace(trace):
    global _current_trace
    _current_trace = trace


def _get_current_trace():
    return _current_trace


# ═══════════════════════════════════════════════════════════════════════════════
# CLICKHOUSE HTTP HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
_CH_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
_CH_PORT = os.getenv("CLICKHOUSE_PORT", "8123")
_CH_USER = os.getenv("CLICKHOUSE_USER", "default")
_CH_PASS = os.getenv("CLICKHOUSE_PASSWORD", "")
_CH_DB = os.getenv("CLICKHOUSE_DATABASE", "daddes_fund")


def _ch_base() -> str:
    proto = "https" if _CH_PORT in ("8443", "443") or "cloud" in _CH_HOST else "http"
    return f"{proto}://{_CH_HOST}:{_CH_PORT}"


def _ch_auth() -> tuple[str, str] | None:
    return (_CH_USER, _CH_PASS) if _CH_PASS else None


def ch_query(sql: str) -> List[Dict[str, Any]]:
    """Run a ClickHouse query.  SELECTs return rows; mutations return status."""
    t0 = time.time()
    try:
        is_select = sql.strip().upper().startswith("SELECT")
        body = f"{sql} FORMAT JSON" if is_select else sql
        resp = httpx.post(
            _ch_base(),
            params={"database": _CH_DB},
            content=body,
            auth=_ch_auth(),
            headers={"Content-Type": "text/plain"},
            timeout=10.0,
        )
        resp.raise_for_status()
        result = resp.json().get("data", []) if is_select else [{"status": "ok"}]
        dur = int((time.time() - t0) * 1000)
        langfuse_log_clickhouse(_get_current_trace(), "SELECT" if is_select else "MUTATION", "query", len(result), dur)
        return result
    except Exception as exc:
        dur = int((time.time() - t0) * 1000)
        langfuse_log_clickhouse(_get_current_trace(), "ERROR", "query", 0, dur)
        return [{"_error": str(exc)}]


def ch_insert(table: str, rows: List[Dict[str, Any]]) -> Dict[str, str]:
    """Insert rows into a ClickHouse table via JSONEachRow."""
    t0 = time.time()
    try:
        body = "\n".join(json.dumps(r) for r in rows)
        resp = httpx.post(
            _ch_base(),
            params={
                "database": _CH_DB,
                "query": f"INSERT INTO {table} FORMAT JSONEachRow",
            },
            content=body,
            auth=_ch_auth(),
            headers={"Content-Type": "text/plain"},
            timeout=10.0,
        )
        resp.raise_for_status()
        dur = int((time.time() - t0) * 1000)
        langfuse_log_clickhouse(_get_current_trace(), "INSERT", table, len(rows), dur)
        return {"status": "ok", "inserted": len(rows)}
    except Exception as exc:
        dur = int((time.time() - t0) * 1000)
        langfuse_log_clickhouse(_get_current_trace(), "INSERT_ERROR", table, 0, dur)
        return {"status": "error", "message": str(exc)}


# ═══════════════════════════════════════════════════════════════════════════════
# DISASTER VERIFIER TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def query_disaster_events_db(
    tool_context: ToolContext,
    disaster_type: str = "",
    region: str = "",
    status: str = "ACTIVE",
    limit: int = 20,
) -> Dict[str, Any]:
    """Query the ClickHouse disaster_events table for known disaster events.

    Args:
        disaster_type: Filter by type (FLOOD, EARTHQUAKE, WILDFIRE, TYPHOON, OTHER). Empty = all.
        region: Region or country substring to search for. Empty = all.
        status: Status filter (ACTIVE, RESOLVED, ARCHIVED). Default ACTIVE.
        limit: Max rows to return. Default 20.
    """
    clauses = [f"status = '{status}'"]
    if disaster_type:
        clauses.append(f"type = '{disaster_type.upper()}'")
    if region:
        clauses.append(f"(region ILIKE '%{region}%' OR country ILIKE '%{region}%')")
    where = " AND ".join(clauses)
    rows = ch_query(
        f"SELECT id, name, type, severity, region, country, status, description, source, "
        f"started_at, resolved_at, created_at "
        f"FROM disaster_events WHERE {where} ORDER BY started_at DESC LIMIT {limit}"
    )
    return {"source": "ClickHouse", "disasters": rows, "count": len(rows)}


def fetch_gdacs_disasters(
    tool_context: ToolContext,
    event_types: str = "EQ;TC;FL;VO;WF;DR",
    days_back: int = 30,
    alert_level: str = "GREEN;ORANGE;RED",
) -> Dict[str, Any]:
    """Fetch recent disaster alerts from the GDACS (Global Disaster Alert and Coordination System).

    Args:
        event_types: Semicolon-separated GDACS codes (EQ=Earthquake, TC=Tropical Cyclone, FL=Flood, VO=Volcano, WF=Wildfire, DR=Drought).
        days_back: How many days back to search. Default 30.
        alert_level: Semicolon-separated alert levels (GREEN, ORANGE, RED). Default all.
    """
    try:
        now = datetime.now(timezone.utc)
        from_str = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")
        to_str = now.strftime("%Y-%m-%d")
        url = (
            "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"
            f"?eventlist={event_types}&fromDate={from_str}&toDate={to_str}"
            f"&alertlevel={alert_level}"
        )
        resp = httpx.get(url, timeout=15.0, headers={"Accept": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", [])[:20]
        summaries = []
        for f in features:
            props = f.get("properties", {})
            summaries.append({
                "name": props.get("name", ""),
                "event_type": props.get("eventtype", ""),
                "alert_level": props.get("alertlevel", ""),
                "severity": props.get("severity", {}),
                "country": props.get("country", ""),
                "date": props.get("fromdate", ""),
                "url": props.get("url", {}).get("report", "") if isinstance(props.get("url"), dict) else "",
            })
        return {"source": "GDACS", "events": summaries, "count": len(summaries)}
    except Exception as exc:
        return {"source": "GDACS", "error": str(exc), "events": []}


def fetch_usgs_earthquakes(
    tool_context: ToolContext,
    min_magnitude: float = 4.0,
    days_back: int = 30,
    latitude: float = 0.0,
    longitude: float = 0.0,
    max_radius_km: float = 0.0,
) -> Dict[str, Any]:
    """Query the USGS earthquake catalog for recent seismic events.

    Args:
        min_magnitude: Minimum earthquake magnitude. Default 4.0.
        days_back: How many days back to search. Default 30.
        latitude: Center latitude for radius search. 0 = no geographic filter.
        longitude: Center longitude for radius search.
        max_radius_km: Max search radius in km. 0 = global search.
    """
    try:
        now = datetime.now(timezone.utc)
        params: Dict[str, Any] = {
            "format": "geojson",
            "starttime": (now - timedelta(days=days_back)).strftime("%Y-%m-%d"),
            "endtime": now.strftime("%Y-%m-%d"),
            "minmagnitude": min_magnitude,
            "limit": 20,
            "orderby": "time",
        }
        if latitude and longitude and max_radius_km > 0:
            params.update({
                "latitude": latitude,
                "longitude": longitude,
                "maxradiuskm": max_radius_km,
            })
        resp = httpx.get(
            "https://earthquake.usgs.gov/fdsnws/event/1/query",
            params=params,
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        quakes = []
        for feat in data.get("features", [])[:20]:
            p = feat.get("properties", {})
            quakes.append({
                "place": p.get("place", ""),
                "magnitude": p.get("mag"),
                "time": p.get("time"),
                "alert": p.get("alert"),
                "tsunami": p.get("tsunami"),
                "url": p.get("url", ""),
            })
        return {"source": "USGS", "earthquakes": quakes, "count": len(quakes)}
    except Exception as exc:
        return {"source": "USGS", "error": str(exc), "earthquakes": []}


def fetch_reliefweb_disasters(
    tool_context: ToolContext,
    query_text: str = "",
    disaster_type: str = "",
    country: str = "",
    limit: int = 15,
) -> Dict[str, Any]:
    """Search the UN ReliefWeb humanitarian disaster database.

    Args:
        query_text: Free text search query. Optional.
        disaster_type: Disaster type name (e.g. "Flood", "Earthquake"). Optional.
        country: Country name to filter by. Optional.
        limit: Max results to return. Default 15.
    """
    try:
        payload: Dict[str, Any] = {
            "appname": "daddes-fund",
            "limit": limit,
            "fields": {"include": ["name", "status", "date", "type", "country", "url"]},
            "sort": ["date.created:desc"],
        }
        filters: list[dict] = []
        if query_text:
            payload["query"] = {"value": query_text}
        if disaster_type:
            filters.append({"field": "type.name", "value": disaster_type})
        if country:
            filters.append({"field": "country.name", "value": country})
        if len(filters) > 1:
            payload["filter"] = {"conditions": filters, "operator": "AND"}
        elif len(filters) == 1:
            payload["filter"] = filters[0]

        resp = httpx.post(
            "https://api.reliefweb.int/v1/disasters",
            json=payload,
            timeout=15.0,
        )
        resp.raise_for_status()
        items = []
        for d in resp.json().get("data", []):
            fields = d.get("fields", {})
            items.append({
                "name": fields.get("name", ""),
                "status": fields.get("status", ""),
                "date": (fields.get("date") or {}).get("created", ""),
                "types": [t.get("name") for t in fields.get("type", [])],
                "countries": [c.get("name") for c in fields.get("country", [])],
                "url": fields.get("url", ""),
            })
        return {"source": "ReliefWeb", "disasters": items, "count": len(items)}
    except Exception as exc:
        return {"source": "ReliefWeb", "error": str(exc), "disasters": []}


def set_verification_result(
    tool_context: ToolContext,
    disaster_verified: bool,
    confidence: float,
    reasoning: str,
    sources_checked: list[str],
    disaster_id: str = "",
    disaster_details: dict = {},
) -> Dict[str, str]:
    """Store the disaster verification result in shared state and log to ClickHouse.

    You MUST call this after completing your verification analysis.

    Args:
        disaster_verified: Whether the disaster has been confirmed to actually exist.
        confidence: Confidence score from 0.0 to 1.0.
        reasoning: Explanation of why the disaster was or was not verified.
        sources_checked: List of source names consulted (e.g. "GDACS", "USGS", "Google Search", "ClickHouse").
        disaster_id: UUID of a matching disaster_events row in ClickHouse, if found. Empty string if not found.
        disaster_details: Optional dict with type, severity, region, country, date of the disaster.
    """
    result = {
        "disaster_verified": disaster_verified,
        "confidence": confidence,
        "reasoning": reasoning,
        "sources_checked": sources_checked,
        "disaster_id": disaster_id,
        "disaster_details": disaster_details or {},
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }
    tool_context.state["verification_result"] = result

    # Log to Langfuse
    langfuse_log_tool(
        _get_current_trace(),
        "set_verification_result",
        {"disaster_verified": disaster_verified, "confidence": confidence, "sources_checked": sources_checked},
        result,
    )

    # Audit log to ClickHouse events_log
    ch_insert("events_log", [{
        "id": str(uuid.uuid4()),
        "event_type": "DISASTER_VERIFICATION",
        "service": "ai",
        "payload": json.dumps(result),
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    }])

    return {
        "status": "success",
        "message": f"Verification stored: verified={disaster_verified}, confidence={confidence}",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CLAIM RECOMMENDER TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def get_community_rules(tool_context: ToolContext) -> Dict[str, Any]:
    """Fetch the latest community-voted rules from ClickHouse.

    Returns the current active rules including AI confidence thresholds,
    payout limits, distribution model, and disaster severity minimums.
    These rules are set by community vote — the AI must never change them.
    """
    rows = ch_query(
        "SELECT * FROM community_rules FINAL ORDER BY version DESC LIMIT 1"
    )
    if rows and "_error" not in rows[0]:
        tool_context.state["community_rules"] = rows[0]
        return {"status": "success", "rules": rows[0]}

    defaults = {
        "version": 0,
        "min_ai_confidence": 0.85,
        "max_payout_per_recipient": 500,
        "distribution_model": "severity_based",
        "min_disaster_severity": 3,
        "reserve_percentage": 0.10,
    }
    tool_context.state["community_rules"] = defaults
    return {
        "status": "defaults",
        "rules": defaults,
        "note": "Using defaults — ClickHouse unavailable or community_rules table is empty",
    }


def set_recommendation(
    tool_context: ToolContext,
    claim_id: str,
    decision: str,
    confidence_score: float,
    reasoning: str,
    matched_rules: list[str],
    risk_flags: list[str],
    suggested_payout: float = 0.0,
) -> Dict[str, str]:
    """Store the claim recommendation in shared state and log to ClickHouse ai_inferences.

    You MUST call this after completing your claim evaluation.

    Args:
        claim_id: UUID of the claim being evaluated.
        decision: One of RECOMMEND_APPROVE, RECOMMEND_DENY, or RECOMMEND_ESCALATE.
        confidence_score: Confidence from 0.0 to 1.0.
        reasoning: Detailed explanation of the recommendation.
        matched_rules: List of community rule names that influenced the decision.
        risk_flags: List of risk indicators found (empty list if none).
        suggested_payout: Suggested payout amount based on rules. 0 if denied.
    """
    result = {
        "claim_id": claim_id,
        "decision": decision,
        "confidence_score": confidence_score,
        "reasoning": reasoning,
        "matched_rules": matched_rules,
        "risk_flags": risk_flags,
        "suggested_payout": suggested_payout,
        "recommended_at": datetime.now(timezone.utc).isoformat(),
    }
    tool_context.state["recommendation"] = result

    # Log to Langfuse
    langfuse_log_tool(
        _get_current_trace(),
        "set_recommendation",
        {"claim_id": claim_id, "decision": decision, "confidence_score": confidence_score},
        result,
    )

    # Log to ClickHouse ai_inferences table
    inference_id = str(uuid.uuid4())
    ch_insert("ai_inferences", [{
        "id": inference_id,
        "claim_id": claim_id,
        "agent_type": "RECOMMENDER",
        "model": GEMINI_MODEL,
        "input_text": json.dumps({
            "claim_id": claim_id,
            "verification": tool_context.state.get("verification_result", {}),
        }),
        "raw_response": json.dumps(result),
        "output_json": json.dumps(result),
        "decision": decision,
        "confidence_score": confidence_score,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    }])

    return {
        "status": "success",
        "message": f"Recommendation stored: {decision} (confidence={confidence_score})",
    }


def update_claim_status(
    tool_context: ToolContext,
    claim_id: str,
    new_status: str,
    ai_recommendation: str = "",
    ai_recommendation_confidence: float = 0.0,
) -> Dict[str, str]:
    """Update a claim's workflow status in ClickHouse.

    Args:
        claim_id: UUID of the claim.
        new_status: New status — one of: AI_REVIEWING, PENDING_HUMAN_APPROVAL, NEEDS_REVIEW, DENIED_BY_AI, ESCALATED.
        ai_recommendation: The AI decision (RECOMMEND_APPROVE, RECOMMEND_DENY, RECOMMEND_ESCALATE). Optional.
        ai_recommendation_confidence: The confidence score. Optional.
    """
    try:
        sets = [f"status = '{new_status}'", "updated_at = now()"]
        if ai_recommendation:
            sets.append(f"ai_recommendation = '{ai_recommendation}'")
            sets.append(f"ai_recommendation_confidence = {ai_recommendation_confidence}")
        sql = f"ALTER TABLE claims UPDATE {', '.join(sets)} WHERE id = '{claim_id}'"
        ch_query(sql)
        return {"status": "success", "message": f"Claim {claim_id} updated to {new_status}"}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


# ═══════════════════════════════════════════════════════════════════════════════
# CALLBACKS  (same pattern as previous agent, adapted per sub-agent)
# ═══════════════════════════════════════════════════════════════════════════════

def on_before_agent(callback_context: CallbackContext):
    """Initialize shared state for the claim processing pipeline."""
    defaults = {
        "verification_result": None,
        "recommendation": None,
        "community_rules": None,
    }
    for key, val in defaults.items():
        if key not in callback_context.state:
            callback_context.state[key] = val
    return None


def _inject_state_prefix(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
    prefix: str,
) -> None:
    """Helper — prepend *prefix* text into the model's system instruction."""
    original = llm_request.config.system_instruction or types.Content(
        role="system", parts=[]
    )
    if not isinstance(original, types.Content):
        original = types.Content(
            role="system", parts=[types.Part(text=str(original))]
        )
    if not original.parts:
        original.parts = [types.Part(text="")]
    if original.parts and len(original.parts) > 0:
        original.parts[0].text = prefix + (original.parts[0].text or "")
    llm_request.config.system_instruction = original


def before_model_modifier(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Inject pipeline state into each agent's system prompt so the LLM has context.
    Also start a Langfuse generation span for every LLM call."""
    agent_name = callback_context.agent_name
    trace = _get_current_trace()

    # Start a Langfuse generation for this LLM call
    if trace:
        # Collect input text from the request
        input_summary = ""
        if llm_request.contents:
            for content in llm_request.contents[-2:]:  # last 2 messages for brevity
                for part in (content.parts or []):
                    if hasattr(part, "text") and part.text:
                        input_summary += part.text[:500] + "\n"
        gen = langfuse_generation(
            trace,
            name=f"llm:{agent_name}",
            model=GEMINI_MODEL,
            input_data=input_summary[:2000] or f"[{agent_name} call]",
            metadata={"agent": agent_name},
        )
        # Store generation ref on callback context for after_model to close it
        callback_context.state[f"_langfuse_gen_{agent_name}"] = gen

    if agent_name == "DisasterVerifier":
        verification = callback_context.state.get("verification_result")
        _inject_state_prefix(
            callback_context,
            llm_request,
            f"== Pipeline State ==\n"
            f"Verification Result: "
            f"{json.dumps(verification, indent=2) if verification else 'Not yet verified — perform verification now.'}\n\n",
        )

    elif agent_name == "ClaimRecommender":
        verification = callback_context.state.get("verification_result")
        rules = callback_context.state.get("community_rules")
        _inject_state_prefix(
            callback_context,
            llm_request,
            f"== Pipeline State ==\n"
            f"Disaster Verification: {json.dumps(verification, indent=2) if verification else 'No verification available.'}\n"
            f"Community Rules: {json.dumps(rules, indent=2) if rules else 'Not loaded yet — call get_community_rules first.'}\n\n",
        )

    elif agent_name == "DaddesFundAgent":
        verification = callback_context.state.get("verification_result")
        recommendation = callback_context.state.get("recommendation")
        _inject_state_prefix(
            callback_context,
            llm_request,
            f"== Pipeline State ==\n"
            f"Verification: {json.dumps(verification, indent=2) if verification else 'None'}\n"
            f"Recommendation: {json.dumps(recommendation, indent=2) if recommendation else 'None'}\n\n",
        )

    return None


def after_model_modifier(
    callback_context: CallbackContext, llm_response: LlmResponse
) -> Optional[LlmResponse]:
    """End invocation when the agent produces a final text response (not a tool call).
    Also close the Langfuse generation span with the model output."""
    agent_name = callback_context.agent_name

    # Close the Langfuse generation with the response
    gen = callback_context.state.get(f"_langfuse_gen_{agent_name}")
    if gen and llm_response.content and llm_response.content.parts:
        try:
            output_text = "\n".join(
                p.text for p in llm_response.content.parts if hasattr(p, "text") and p.text
            )[:3000]
            # Check if it's a tool call vs text response
            has_tool_call = any(
                hasattr(p, "function_call") and p.function_call
                for p in llm_response.content.parts
            )
            gen.end(
                output=output_text or "[tool call]" if not has_tool_call else f"[tool_call] {output_text}",
                metadata={"is_tool_call": has_tool_call, "agent": agent_name},
            )
        except Exception:
            pass

    if llm_response.content and llm_response.content.parts:
        if (
            llm_response.content.role == "model"
            and llm_response.content.parts[0].text
        ):
            callback_context._invocation_context.end_invocation = True
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# AGENT DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

disaster_verifier = LlmAgent(
    name="DisasterVerifier",
    model=GEMINI_MODEL,
    instruction="""You are the Disaster Verification Agent for Dadde's Fund, a community emergency aid platform.

Your SOLE job is to verify whether a reported disaster ACTUALLY HAPPENED by cross-referencing
multiple authoritative sources.  You are the first gate in the claim verification pipeline.

WORKFLOW:
1. When given a disaster claim or event to verify, use your tools to check:
   a. query_disaster_events_db — check if the disaster is already registered in our ClickHouse database
   b. google_search — search the web for news articles and official reports about the disaster
   c. fetch_gdacs_disasters — check the GDACS global disaster alert system
   d. fetch_usgs_earthquakes — specifically for earthquake claims, check USGS seismic data
   e. fetch_reliefweb_disasters — check the UN ReliefWeb humanitarian disaster database

2. Cross-reference AT LEAST 2-3 sources before your determination.
   - Found in our DB AND in GDACS / USGS / ReliefWeb  → high confidence (≥ 0.9)
   - Found in news articles but not in official databases → medium confidence (0.7–0.9)
   - No evidence from any source                        → low confidence (< 0.7) → likely not verified

3. After your analysis you MUST call set_verification_result with your findings.

DECISION CRITERIA:
- disaster_verified = true  → confirmed from ≥ 2 independent sources
- disaster_verified = false → no credible evidence found
- confidence: 0.9+ multiple official sources; 0.7–0.9 partial evidence; < 0.7 weak/none

Be thorough but efficient.  Check 2-3 sources, cross-reference, then call set_verification_result.
Always explain which sources you checked and what evidence you found or didn't find.""",
    tools=[
        query_disaster_events_db,
        fetch_gdacs_disasters,
        fetch_usgs_earthquakes,
        fetch_reliefweb_disasters,
        set_verification_result,
        google_search,
    ],
    before_model_callback=before_model_modifier,
    after_model_callback=after_model_modifier,
)


claim_recommender = LlmAgent(
    name="ClaimRecommender",
    model=GEMINI_MODEL,
    instruction="""You are the Claim Recommendation Agent for Dadde's Fund, a community emergency aid platform.

You evaluate disaster relief claims against community-voted rules and the disaster verification
that was already completed by the Disaster Verifier agent.

WORKFLOW:
1. Call get_community_rules to load the current community-voted thresholds.
2. Review the disaster verification result (injected in your context).
3. Evaluate the claim:
   - Is the disaster verified?  If not → RECOMMEND_DENY or RECOMMEND_ESCALATE.
   - Does the claim description match the disaster type and region?
   - Does the evidence support the claimed damage?
   - Does the requested amount comply with max_payout_per_recipient?
   - Is the disaster severity ≥ min_disaster_severity?
4. Make your recommendation:
   - RECOMMEND_APPROVE  — disaster verified, evidence consistent, all rules met, confidence ≥ min_ai_confidence
   - RECOMMEND_DENY     — no verification, evidence inconsistent, or clear rule violation
   - RECOMMEND_ESCALATE — ambiguous evidence, edge cases, or borderline confidence
5. You MUST call set_recommendation with your structured decision.
6. Then call update_claim_status to set the claim's workflow status:
   - RECOMMEND_APPROVE  with high confidence → PENDING_HUMAN_APPROVAL
   - RECOMMEND_DENY                         → DENIED_BY_AI
   - RECOMMEND_ESCALATE                     → ESCALATED
   - Low confidence or issues               → NEEDS_REVIEW

CRITICAL RULES:
- You advise only.  A human Collector must approve any payout.
- The AI confidence threshold is set by community vote, not by you.
- Be transparent about your reasoning.
- If the disaster was NOT verified, default to RECOMMEND_ESCALATE unless clearly fraudulent.
- Always load and consult community rules before making a decision.""",
    tools=[
        get_community_rules,
        set_recommendation,
        update_claim_status,
    ],
    before_model_callback=before_model_modifier,
    after_model_callback=after_model_modifier,
)


# ── Root Orchestrator ─────────────────────────────────────────────────────────

root_agent = LlmAgent(
    name="DaddesFundAgent",
    model=GEMINI_MODEL,
    instruction="""You are the Dadde's Fund AI Assistant — a helpful agent for a community-driven
disaster emergency aid platform.

You can help users with:
1. **General questions** about Dadde's Fund, how it works, donation flows, governance.
2. **Disaster verification** — when a disaster is reported or a claim references a disaster,
   delegate to the DisasterVerifier agent first.
3. **Claim evaluation** — after disaster verification succeeds, delegate to the
   ClaimRecommender agent to evaluate the claim against community rules.
4. **User preferences** — help users manage their donation preferences.

DELEGATION RULES:
- User mentions / reports a disaster, or submits a claim  → transfer to DisasterVerifier
- After DisasterVerifier completes (verification_result is in state) AND there is a claim
  to evaluate → transfer to ClaimRecommender
- General questions about the fund, governance, privacy  → answer directly yourself

ABOUT DADDE'S FUND:
Dadde's Fund is a digital ROSCA (community emergency fund) that:
 • Collects continuous micro-contributions via Open Payments (donations, subscriptions, round-ups)
 • Detects disasters and evaluates relief claims using AI + community-voted rules
 • Requires human-in-the-loop approval before any payout executes
 • Logs all AI reasoning to ClickHouse as a transparent audit trail
 • Protects recipient privacy — no individual payout data is ever publicly shown
 • The AI never sets thresholds or makes final decisions — only advises

Be concise, helpful, and transparent.""",
    sub_agents=[disaster_verifier, claim_recommender],
    before_agent_callback=on_before_agent,
    before_model_callback=before_model_modifier,
    after_model_callback=after_model_modifier,
)


# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI + COPILOTKIT BRIDGE
# ═══════════════════════════════════════════════════════════════════════════════

adk_agent = ADKAgent(
    adk_agent=root_agent,
    user_id="demo_user",
    session_timeout_seconds=3600,
    use_in_memory_services=True,
)

app = FastAPI(title="Dadde's Fund AI Agent")

add_adk_fastapi_endpoint(app, adk_agent, path="/")


# ═══════════════════════════════════════════════════════════════════════════════
# DIRECT API ENDPOINTS  (called by Next.js server-side, NOT via CopilotKit)
# ═══════════════════════════════════════════════════════════════════════════════

# Shared ADK runner + session service for direct calls
_session_service = InMemorySessionService()

APP_NAME = "daddes_fund_pipeline"


async def _run_agent(agent: LlmAgent, prompt: str) -> dict:
    """Run an ADK agent directly and collect state + final text response.
    Every run is fully traced in Langfuse: trace → generation spans → tool spans."""
    run_id = str(uuid.uuid4())[:8]
    t0 = time.time()

    # Start a Langfuse trace for this pipeline run
    trace = langfuse_trace(
        name=f"pipeline:{agent.name}",
        input=prompt[:2000],
        metadata={"agent": agent.name, "model": GEMINI_MODEL, "run_id": run_id},
        tags=["adk", agent.name.lower(), "pipeline"],
    )
    _set_current_trace(trace)

    session = await _session_service.create_session(
        app_name=APP_NAME, user_id="pipeline_runner"
    )
    runner = Runner(
        agent=agent, app_name=APP_NAME, session_service=_session_service
    )
    content = types.Content(role="user", parts=[types.Part(text=prompt)])

    final_text = ""
    events = []
    event_count = 0
    async for event in runner.run_async(
        user_id="pipeline_runner",
        session_id=session.id,
        new_message=content,
    ):
        events.append(event)
        event_count += 1
        if event.is_final_response() and event.content and event.content.parts:
            final_text = "\n".join(
                p.text for p in event.content.parts if hasattr(p, "text") and p.text
            )

    # Retrieve state from session
    updated_session = await _session_service.get_session(
        app_name=APP_NAME, user_id="pipeline_runner", session_id=session.id
    )
    state = dict(updated_session.state) if updated_session and updated_session.state else {}

    duration_ms = int((time.time() - t0) * 1000)

    # End Langfuse trace with output
    if trace:
        try:
            trace.update(
                output=final_text[:3000] or "[no text output]",
                metadata={
                    "agent": agent.name,
                    "duration_ms": duration_ms,
                    "event_count": event_count,
                    "has_verification": "verification_result" in state,
                    "has_recommendation": "recommendation" in state,
                },
            )
        except Exception:
            pass

    # Log to ClickHouse events_log too (dual-channel audit)
    ch_insert("events_log", [{
        "id": str(uuid.uuid4()),
        "event_type": "AI_PIPELINE_RUN",
        "service": "ai",
        "payload": json.dumps({
            "agent": agent.name,
            "run_id": run_id,
            "duration_ms": duration_ms,
            "event_count": event_count,
            "has_verification": "verification_result" in state,
            "has_recommendation": "recommendation" in state,
            "langfuse_traced": trace is not None,
        }),
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    }])

    langfuse_flush()
    _set_current_trace(None)

    return {"text": final_text, "state": state}


# ── Request / Response models ────────────────────────────────────────────────

class VerifyDisasterRequest(BaseModel):
    disaster_description: str = Field(..., description="Description of the disaster to verify")
    disaster_type: str = Field("", description="FLOOD, EARTHQUAKE, WILDFIRE, TYPHOON, OTHER")
    region: str = Field("", description="Geographic region or country")


class VerifyDisasterResponse(BaseModel):
    disaster_verified: bool
    confidence: float
    reasoning: str
    sources_checked: list[str]
    disaster_id: str
    disaster_details: dict
    agent_text: str


class EvaluateClaimRequest(BaseModel):
    claim_id: str = Field(..., description="UUID of the claim")
    claim_description: str = Field(..., description="Text description of the claim")
    disaster_description: str = Field("", description="Disaster context for the claim")
    disaster_type: str = Field("", description="Type of disaster")
    region: str = Field("", description="Region")
    disaster_id: str = Field("", description="Known disaster_event_id if available")


class EvaluateClaimResponse(BaseModel):
    verification: dict
    recommendation: dict
    agent_text: str


class CheckDisasterNewsRequest(BaseModel):
    regions: list[str] = Field(default=["Southeast Asia", "Asia", "Global"])
    event_types: str = Field("EQ;TC;FL;VO;WF;DR", description="GDACS event type codes")


class CheckDisasterNewsResponse(BaseModel):
    new_disasters: list[dict]
    agent_text: str


class EligibleRecipient(BaseModel):
    id: str = Field(..., description="User profile ID")
    display_name: str = Field("")
    wallet_address: str = Field(...)
    bio: str = Field("")


class RecommendRecipientsRequest(BaseModel):
    disaster_event_id: str = Field("", description="Disaster event ID for context")
    disaster_name: str = Field("", description="Human-readable disaster name")
    disaster_type: str = Field("", description="FLOOD, EARTHQUAKE, etc.")
    disaster_description: str = Field("")
    disaster_severity: int = Field(5, description="1-10 severity scale")
    region: str = Field("")
    total_fund_available: float = Field(0, description="Available fund balance")
    eligible_recipients: list[EligibleRecipient] = Field(
        default=[], description="List of users with wallet addresses eligible for payouts"
    )


class RecipientRecommendation(BaseModel):
    recipient_id: str
    display_name: str
    wallet_address: str
    suggested_amount: float
    justification: str
    priority: str  # "high" | "medium" | "low"


class RecommendRecipientsResponse(BaseModel):
    recommendations: list[RecipientRecommendation]
    total_recommended: float
    reasoning: str
    agent_text: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/verify-disaster", response_model=VerifyDisasterResponse)
async def verify_disaster_endpoint(req: VerifyDisasterRequest):
    """
    Run the DisasterVerifier agent to confirm whether a disaster actually happened.
    Called by Next.js when a claim is submitted or when doing a manual disaster check.
    """
    prompt_parts = [f"Verify this disaster: {req.disaster_description}"]
    if req.disaster_type:
        prompt_parts.append(f"Type: {req.disaster_type}")
    if req.region:
        prompt_parts.append(f"Region: {req.region}")
    prompt_parts.append(
        "Check at least 2-3 sources (ClickHouse DB, GDACS, USGS, ReliefWeb, Google Search) "
        "then call set_verification_result with your findings."
    )

    result = await _run_agent(disaster_verifier, "\n".join(prompt_parts))
    verification = result["state"].get("verification_result", {})

    if not verification:
        verification = {
            "disaster_verified": False,
            "confidence": 0.0,
            "reasoning": "Agent did not produce a verification result",
            "sources_checked": [],
            "disaster_id": "",
            "disaster_details": {},
        }

    return VerifyDisasterResponse(
        disaster_verified=verification.get("disaster_verified", False),
        confidence=verification.get("confidence", 0.0),
        reasoning=verification.get("reasoning", ""),
        sources_checked=verification.get("sources_checked", []),
        disaster_id=verification.get("disaster_id", ""),
        disaster_details=verification.get("disaster_details", {}),
        agent_text=result["text"],
    )


@app.post("/evaluate-claim", response_model=EvaluateClaimResponse)
async def evaluate_claim_endpoint(req: EvaluateClaimRequest):
    """
    Full pipeline: DisasterVerifier → ClaimRecommender.
    Called by POST /api/claims/submit in Next.js.
    """
    # Step 1: Verify the disaster
    verify_prompt_parts = []
    if req.disaster_description:
        verify_prompt_parts.append(f"Verify this disaster: {req.disaster_description}")
    if req.disaster_type:
        verify_prompt_parts.append(f"Type: {req.disaster_type}")
    if req.region:
        verify_prompt_parts.append(f"Region: {req.region}")
    if req.disaster_id:
        verify_prompt_parts.append(f"Known disaster_event_id: {req.disaster_id}")
    verify_prompt_parts.append(
        "Check at least 2-3 sources then call set_verification_result."
    )

    verify_result = await _run_agent(disaster_verifier, "\n".join(verify_prompt_parts))
    verification = verify_result["state"].get("verification_result", {})

    if not verification:
        verification = {
            "disaster_verified": False,
            "confidence": 0.0,
            "reasoning": "Verification agent did not produce a result",
            "sources_checked": [],
            "disaster_id": "",
            "disaster_details": {},
        }

    # Step 2: Run the recommender with the verification context injected
    rec_prompt = (
        f"Evaluate claim {req.claim_id}.\n"
        f"Claim description: {req.claim_description}\n"
        f"Disaster verification result: {json.dumps(verification, indent=2)}\n\n"
        f"Load community rules, evaluate the claim, then call set_recommendation "
        f"and update_claim_status."
    )

    # Inject the verification state into the recommender by setting it on a fresh session
    rec_result = await _run_agent(claim_recommender, rec_prompt)
    recommendation = rec_result["state"].get("recommendation", {})

    if not recommendation:
        recommendation = {
            "claim_id": req.claim_id,
            "decision": "RECOMMEND_ESCALATE",
            "confidence_score": 0.0,
            "reasoning": "Recommender agent did not produce a result — escalating to human review",
            "matched_rules": [],
            "risk_flags": ["agent_no_output"],
            "suggested_payout": 0.0,
        }

    return EvaluateClaimResponse(
        verification=verification,
        recommendation=recommendation,
        agent_text=rec_result["text"],
    )


@app.post("/check-disaster-news", response_model=CheckDisasterNewsResponse)
async def check_disaster_news_endpoint(req: CheckDisasterNewsRequest):
    """
    Proactive disaster scanning: check GDACS, USGS, ReliefWeb, and Google News
    for new disasters. Called on a schedule or manual trigger.
    Stores any newly discovered disasters in ClickHouse disaster_events.
    """
    regions_text = ", ".join(req.regions)
    prompt = (
        f"Check for new disaster events in these regions: {regions_text}.\n"
        f"Use fetch_gdacs_disasters, fetch_usgs_earthquakes, fetch_reliefweb_disasters, "
        f"and google_search to find recently reported disasters.\n"
        f"For each disaster you find, check if it already exists in our database using "
        f"query_disaster_events_db. If it's new, call set_verification_result for it.\n"
        f"Summarize what you found."
    )

    result = await _run_agent(disaster_verifier, prompt)
    verification = result["state"].get("verification_result")

    new_disasters = []
    if verification and verification.get("disaster_verified"):
        new_disasters.append(verification)

    return CheckDisasterNewsResponse(
        new_disasters=new_disasters,
        agent_text=result["text"],
    )


@app.post("/recommend-recipients", response_model=RecommendRecipientsResponse)
async def recommend_recipients_endpoint(req: RecommendRecipientsRequest):
    """
    AI-driven payout distribution: given a disaster event and a list of eligible
    recipients, the agent recommends how to distribute funds with justifications.
    Called by the admin panel before executing payouts.
    """
    if not req.eligible_recipients:
        return RecommendRecipientsResponse(
            recommendations=[],
            total_recommended=0,
            reasoning="No eligible recipients provided.",
            agent_text="No eligible recipients with wallet addresses were found.",
        )

    # Load community rules for context
    rules_rows = ch_query(
        "SELECT * FROM community_rules FINAL ORDER BY version DESC LIMIT 1"
    )
    community_rules = rules_rows[0] if (rules_rows and "_error" not in rules_rows[0]) else {
        "max_payout_per_recipient": 500,
        "distribution_model": "severity_based",
        "reserve_percentage": 0.10,
    }

    recipients_text = "\n".join(
        f"  - ID: {r.id}, Name: {r.display_name}, Wallet: {r.wallet_address}"
        + (f", Bio: {r.bio}" if r.bio else "")
        for r in req.eligible_recipients
    )

    prompt = f"""You are the Payout Distribution Advisor for Dadde's Fund.

DISASTER CONTEXT:
- Event: {req.disaster_name or 'Unknown'}
- Type: {req.disaster_type or 'Unknown'}
- Description: {req.disaster_description or 'N/A'}
- Severity: {req.disaster_severity}/10
- Region: {req.region or 'Unknown'}

FUND AVAILABILITY:
- Total available: ${req.total_fund_available:.2f}
- Reserve percentage: {community_rules.get('reserve_percentage', 0.10) * 100:.0f}%
- Max per recipient: ${community_rules.get('max_payout_per_recipient', 500)}
- Distribution model: {community_rules.get('distribution_model', 'severity_based')}

ELIGIBLE RECIPIENTS (users with Open Payments wallets who can receive funds):
{recipients_text}

YOUR TASK:
1. Recommend how to distribute the available funds among these recipients for this disaster.
2. Consider:
   - The disaster severity and type
   - The distribution model (severity_based = higher severity → more money; equal = even split)
   - Max payout per recipient from community rules
   - Keep {community_rules.get('reserve_percentage', 0.10) * 100:.0f}% of funds in reserve
   - Each recipient's context (bio if available)
3. For each recipient, provide:
   - A suggested payout amount
   - A priority level (high/medium/low)
   - A brief justification for why they should receive this amount

Respond with a valid JSON object in this exact format (no markdown, no code fences):
{{
  "recommendations": [
    {{
      "recipient_id": "<id>",
      "display_name": "<name>",
      "wallet_address": "<wallet>",
      "suggested_amount": <number>,
      "justification": "<reason>",
      "priority": "high|medium|low"
    }}
  ],
  "total_recommended": <total amount across all recommendations>,
  "reasoning": "<overall distribution rationale>"
}}
"""

    result = await _run_agent(claim_recommender, prompt)
    agent_text = result["text"]

    # Try to parse structured JSON from the agent's response
    recommendations = []
    total_recommended = 0.0
    reasoning = ""

    try:
        # Try parsing the agent text as JSON directly
        import re
        # Find JSON in the response (may be wrapped in markdown code fences)
        json_match = re.search(r'\{[\s\S]*"recommendations"[\s\S]*\}', agent_text)
        if json_match:
            parsed = json.loads(json_match.group())
            for rec in parsed.get("recommendations", []):
                recommendations.append(RecipientRecommendation(
                    recipient_id=rec.get("recipient_id", ""),
                    display_name=rec.get("display_name", ""),
                    wallet_address=rec.get("wallet_address", ""),
                    suggested_amount=float(rec.get("suggested_amount", 0)),
                    justification=rec.get("justification", ""),
                    priority=rec.get("priority", "medium"),
                ))
            total_recommended = float(parsed.get("total_recommended", 0))
            reasoning = parsed.get("reasoning", "")
    except (json.JSONDecodeError, Exception) as e:
        reasoning = f"Agent produced unstructured response. Raw: {agent_text[:500]}"

    # Fallback: if no structured recommendations, create equal distribution
    if not recommendations and req.eligible_recipients:
        reserve = req.total_fund_available * community_rules.get("reserve_percentage", 0.10)
        distributable = req.total_fund_available - reserve
        max_per = community_rules.get("max_payout_per_recipient", 500)
        per_person = min(distributable / len(req.eligible_recipients), max_per)

        for r in req.eligible_recipients:
            recommendations.append(RecipientRecommendation(
                recipient_id=r.id,
                display_name=r.display_name,
                wallet_address=r.wallet_address,
                suggested_amount=round(per_person, 2),
                justification=f"Equal distribution for {req.disaster_name or 'disaster'} relief.",
                priority="medium",
            ))
        total_recommended = round(per_person * len(req.eligible_recipients), 2)
        reasoning = (
            f"Fallback equal distribution: ${distributable:.2f} distributable "
            f"(after {community_rules.get('reserve_percentage', 0.10) * 100:.0f}% reserve) "
            f"split among {len(req.eligible_recipients)} recipients."
        )

    return RecommendRecipientsResponse(
        recommendations=recommendations,
        total_recommended=total_recommended,
        reasoning=reasoning,
        agent_text=agent_text,
    )


@app.get("/health")
async def health():
    lf_status = "connected" if _get_langfuse() is not None else "not_configured"
    return {
        "status": "ok",
        "model": GEMINI_MODEL,
        "pipeline": "verifier→recommender",
        "langfuse": lf_status,
        "clickhouse": f"{_ch_base()}/{_CH_DB}",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# DADDE FUND UI ASSISTANT AGENT
# Chat bubble assistant that explains the platform and controls UI state via
# frontend tools (executed client-side via CopilotKit useFrontendTool hooks).
# ═══════════════════════════════════════════════════════════════════════════════

def get_platform_info(tool_context: ToolContext, topic: str = "") -> Dict[str, str]:
    """Return information about Dadde's Fund platform.

    Args:
        topic: Optional topic to focus on. Options: 'donations', 'open_payments',
               'governance', 'privacy', 'subscriptions', 'claims', 'disasters', or
               leave empty for a general overview.
    """
    info_map = {
        "donations": (
            "Dadde's Fund accepts one-time donations and recurring pledges. "
            "You can donate to a specific disaster campaign or to the Collective Fund, "
            "which distributes to multiple active disasters. "
            "Minimum donation is $1. Payments are powered by Open Payments (Interledger Protocol)."
        ),
        "open_payments": (
            "Open Payments is an open standard for web monetization built on the Interledger Protocol. "
            "It lets you send money directly from your digital wallet without entering card details. "
            "Dadde's Fund uses it for instant, transparent, cross-border payments. "
            "You need an Open Payments-compatible wallet (e.g. Rafiki, Fynbos) to donate."
        ),
        "governance": (
            "Dadde's Fund is governed by the community. Members vote on rules like: "
            "minimum AI confidence thresholds for claim approval, maximum payout per recipient, "
            "fund reserve percentages, and distribution models. "
            "The AI only advises — humans make all final payout decisions."
        ),
        "privacy": (
            "Dadde's Fund protects recipient privacy. Individual payout details are never publicly shown. "
            "You can choose whether to appear on the donor leaderboard. "
            "AI reasoning is logged to ClickHouse as a transparent audit trail, "
            "but no personally identifiable recipient information is exposed."
        ),
        "subscriptions": (
            "You can set up a recurring pledge (weekly, monthly, or quarterly) "
            "from your Open Payments wallet. This is called a 'Monthly Pledge' in settings. "
            "Set the amount and interval in your Donation Preferences. "
            "You can cancel anytime by setting the subscription amount to 0."
        ),
        "claims": (
            "When a disaster occurs, affected community members can submit a relief claim. "
            "Claims are verified by the AI Disaster Verifier agent (checking GDACS, USGS, ReliefWeb, etc.), "
            "then evaluated by the Claim Recommender against community-voted rules. "
            "A human Collector must approve any payout before funds are released."
        ),
        "disasters": (
            "Dadde's Fund monitors disasters globally using GDACS, USGS earthquake data, "
            "UN ReliefWeb, and Google News. Active disaster campaigns are shown on the homepage. "
            "You can filter your donations by disaster type (Flood, Earthquake, Wildfire, Typhoon, Drought, Tsunami) "
            "and geographic region in your Donation Preferences."
        ),
    }

    if topic and topic.lower() in info_map:
        return {"topic": topic, "info": info_map[topic.lower()]}

    return {
        "topic": "overview",
        "info": (
            "Dadde's Fund (DADDE) is a community-powered emergency fund built on the Interledger Protocol. "
            "Think of it as a digital ROSCA — a community savings circle for disaster relief. "
            "\n\n"
            "🌊 What we do: Collect micro-contributions via Open Payments, pool them into a disaster fund, "
            "and distribute relief to verified disaster victims — all governed by community-voted rules. "
            "\n\n"
            "💡 Key features:\n"
            "  • Instant, borderless payments via Open Payments (Interledger)\n"
            "  • AI-assisted disaster verification + claim evaluation\n"
            "  • Community governance — members vote on payout rules\n"
            "  • Human-in-the-loop approval for every payout\n"
            "  • Transparent ClickHouse audit trail\n"
            "  • Recipient privacy protected\n"
            "\n"
            "I can help you: understand the platform, change your donation preferences, "
            "set spending limits, manage your subscription, update notifications, "
            "navigate to any page, or start a donation."
        ),
    }


ui_assistant_agent = LlmAgent(
    name="dadde_fund_agent",
    model=GEMINI_MODEL,
    instruction="""You are Dadde, the friendly AI assistant for Dadde's Fund — a community-powered disaster emergency fund.

Your role is to:
1. **Explain the platform** — answer questions about how Dadde's Fund works, Open Payments, governance, privacy, donations, subscriptions, and disaster relief.
2. **Control the UI** — help users change their settings and preferences using the frontend tools available to you. These tools execute directly in the user's browser.

AVAILABLE FRONTEND TOOLS (called by you, executed in the browser):
- `navigate_to(path)` — navigate to any page (/settings, /my-giving, /impact, /login, /payment/collective, /payment/<campaignId>)
- `update_preferences(disaster_types, geographic_regions)` — update what disaster types and regions the user donates to
- `set_spending_caps(roundup_limit, daily_cap, weekly_cap, monthly_cap)` — update spending limits (all in USD)
- `set_subscription(amount, interval)` — set monthly pledge amount and interval (P1W=weekly, P1M=monthly, P3M=quarterly). Set amount=0 to cancel.
- `set_notifications(email_enabled, push_enabled)` — toggle email and push notifications
- `set_leaderboard_visibility(visible)` — show or hide the user's name on the donor leaderboard
- `navigate_to_donate(campaign_id, amount, donation_type)` — go to the donation page. campaign_id is 'collective' for the general fund or a specific campaign slug. donation_type is 'one-time' or 'recurring'.

BACKEND TOOLS:
- `get_platform_info(topic)` — get detailed platform information to answer user questions

BEHAVIOR RULES:
1. For UI control requests, ALWAYS use the appropriate frontend tool — don't just describe what to do, actually call the tool.
2. For questions about the platform, call `get_platform_info` first, then respond with the information.
3. Be warm, concise, and helpful. Keep responses short and actionable.
4. When navigating, tell the user where you're taking them.
5. When updating settings, confirm what you changed.
6. If a user asks to cancel their subscription, call set_subscription with amount=0.
7. disaster_types valid values: ALL, FLOOD, EARTHQUAKE, WILDFIRE, TYPHOON, DROUGHT, TSUNAMI
8. geographic_regions valid values: GLOBAL, ASIA_PACIFIC, AMERICAS, EUROPE, MIDDLE_EAST, AFRICA

PERSONALITY:
- Friendly and empathetic — this is a disaster relief platform
- Professional but warm
- Proactive — suggest related actions when helpful
- Never make up information about the fund""",
    tools=[get_platform_info],
    after_model_callback=after_model_modifier,
)

adk_ui_agent = ADKAgent(
    adk_agent=ui_assistant_agent,
    user_id="ui_user",
    session_timeout_seconds=3600,
    use_in_memory_services=True,
)

add_adk_fastapi_endpoint(app, adk_ui_agent, path="/dadde/")


if __name__ == "__main__":
    import uvicorn

    if not os.getenv("GOOGLE_API_KEY"):
        print("⚠️  Warning: GOOGLE_API_KEY environment variable not set!")
        print("   Set it with: export GOOGLE_API_KEY='your-key-here'")
        print("   Get a key from: https://makersuite.google.com/app/apikey")
        print()

    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Dadde's Fund AI Agent starting on port {port}")
    print(f"   Model:    {GEMINI_MODEL}")
    print(f"   Pipeline: DisasterVerifier → ClaimRecommender + UI Assistant (dadde_fund_agent)")
    print(f"   ClickHouse: {_ch_base()} / {_CH_DB}")
    uvicorn.run(app, host="0.0.0.0", port=port)
