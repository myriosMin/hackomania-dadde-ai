#!/usr/bin/env python3
"""
Dadde's Fund — Mock Data Generator
===================================
Generates realistic CSV mock data for all ClickHouse tables, then bulk-inserts
them into ClickHouse Cloud (or local).

Produces:
  - 20 disaster events (realistic names, regions, severities)
  - 10,000 transactions (contributions + payouts over 6 months)
  - 2,000 claims (with AI pipeline statuses)
  - 4,000 AI inferences (recommender + critic per claim)
  - 500 governance proposals + 5,000 votes
  - 15,000 event log entries
  - community_rules seed

Usage:
  pip install clickhouse-connect faker python-dotenv
  python scripts/generate_mock_data.py          # generate CSVs only
  python scripts/generate_mock_data.py --push   # generate + push to ClickHouse

CSVs are written to scripts/mock_data/*.csv
"""

import argparse
import csv
import hashlib
import json
import os
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("⚠️  python-dotenv not installed. Loading .env manually won't work.")
    load_dotenv = lambda *a, **kw: None

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CSV_DIR = SCRIPT_DIR / "mock_data"

# Date range for mock data: 6 months back from "now"
NOW = datetime(2026, 3, 7, 12, 0, 0)
START_DATE = NOW - timedelta(days=180)

DISASTER_TYPES = ["FLOOD", "EARTHQUAKE", "WILDFIRE", "TYPHOON", "OTHER"]
REGIONS = ["Southeast Asia", "East Asia", "South Asia", "Oceania", "Global"]
COUNTRIES = [
    "Singapore", "Malaysia", "Indonesia", "Philippines", "Thailand",
    "Vietnam", "Japan", "South Korea", "India", "Bangladesh",
    "Australia", "New Zealand", "Myanmar", "Cambodia", "Nepal",
]
SOURCES = ["GDACS", "USGS", "RELIEFWEB", "MANUAL"]
TX_TYPES = ["CONTRIBUTION", "PAYOUT", "ROUND_UP", "SUBSCRIPTION"]
CLAIM_STATUSES = [
    "SUBMITTED", "AI_REVIEWING", "PENDING_HUMAN_APPROVAL", "NEEDS_REVIEW",
    "APPROVED", "DENIED_BY_AI", "DENIED_BY_HUMAN", "ESCALATED", "PAID",
]
AI_DECISIONS_REC = ["RECOMMEND_APPROVE", "RECOMMEND_DENY", "RECOMMEND_ESCALATE"]
AI_DECISIONS_CRITIC = ["CONCUR", "CHALLENGE"]
EVENT_TYPES = ["API_CALL", "ERROR", "STATE_TRANSITION", "PAYMENT", "AI_INFERENCE"]
SERVICES = ["contributions", "claims", "governance", "ai", "payments"]
MODELS = ["gemini-2.5-flash"]
CURRENCIES = ["USD"]

# Realistic disaster names
DISASTER_NAMES = [
    "Singapore Flash Floods 2025", "Jakarta Flooding 2025",
    "Mindanao Earthquake 2025", "Typhoon Haiyan II",
    "Bangkok Flooding 2026", "Nepal Earthquake Aftershock",
    "Australian Bushfires 2026", "Cyclone Mocha Aftermath",
    "Vietnam Monsoon Floods", "Bali Volcanic Eruption",
    "Myanmar Cyclone Nargis II", "Philippine Sea Typhoon",
    "South Korea Landslides", "Japan Tsunami Warning 2026",
    "Malaysia East Coast Floods", "Cambodia Mekong Flooding",
    "India Kerala Floods 2026", "Bangladesh Cyclone Amphan II",
    "Thailand Chiang Mai Fires", "Indonesia Sulawesi Earthquake",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def random_dt(start: datetime = START_DATE, end: datetime = NOW) -> datetime:
    """Random datetime between start and end."""
    delta = end - start
    secs = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=secs)

def fmt_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def fmt_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")

def sha256(val: str) -> str:
    return hashlib.sha256(val.encode()).hexdigest()[:32]

def new_uuid() -> str:
    return str(uuid.uuid4())

def random_amount(low: float = 0.50, high: float = 500.0) -> float:
    return round(random.uniform(low, high), 4)

def weighted_choice(choices: list, weights: list):
    return random.choices(choices, weights=weights, k=1)[0]

# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def generate_disaster_events(n: int = 20) -> list[dict]:
    """Generate realistic disaster events."""
    rows = []
    for i in range(n):
        started = random_dt()
        is_resolved = random.random() < 0.3
        rows.append({
            "id": new_uuid(),
            "name": DISASTER_NAMES[i % len(DISASTER_NAMES)],
            "type": random.choice(DISASTER_TYPES),
            "severity": random.randint(1, 5),
            "region": random.choice(REGIONS),
            "country": random.choice(COUNTRIES),
            "status": "RESOLVED" if is_resolved else "ACTIVE",
            "description": f"Mock disaster event: {DISASTER_NAMES[i % len(DISASTER_NAMES)]}. Severity impact across the region.",
            "source": random.choice(SOURCES),
            "started_at": fmt_dt(started),
            "resolved_at": fmt_dt(started + timedelta(days=random.randint(7, 60))) if is_resolved else "",
            "created_at": fmt_dt(started),
        })
    return rows


def generate_transactions(n: int = 10000, disaster_ids: list[str] = []) -> list[dict]:
    """Generate a mix of contributions and payouts spanning 6 months."""
    rows = []
    # Skewed toward contributions (70/15/10/5)
    type_weights = [0.55, 0.20, 0.15, 0.10]
    status_weights = {"CONTRIBUTION": [0.90, 0.05, 0.03, 0.02, 0.0],
                      "PAYOUT":       [0.10, 0.70, 0.10, 0.05, 0.05],
                      "ROUND_UP":     [0.92, 0.03, 0.03, 0.02, 0.0],
                      "SUBSCRIPTION": [0.88, 0.05, 0.04, 0.03, 0.0]}
    statuses = ["COMPLETED", "PENDING", "FAILED", "CANCELLED", "INSUFFICIENT_FUNDS"]

    for _ in range(n):
        tx_type = weighted_choice(TX_TYPES, type_weights)
        created = random_dt()
        
        if tx_type == "CONTRIBUTION":
            amount = random_amount(1.0, 100.0)
        elif tx_type == "ROUND_UP":
            amount = random_amount(0.01, 2.00)
        elif tx_type == "SUBSCRIPTION":
            amount = random_amount(5.0, 50.0)
        else:  # PAYOUT
            amount = random_amount(50.0, 500.0)

        disaster_id = random.choice(disaster_ids) if disaster_ids and random.random() < 0.7 else ""

        rows.append({
            "id": new_uuid(),
            "type": tx_type,
            "amount": f"{amount:.4f}",
            "currency": "USD",
            "sender_wallet_hash": sha256(f"donor_{random.randint(1, 500)}"),
            "recipient_wallet_hash": sha256(f"recipient_{random.randint(1, 200)}") if tx_type == "PAYOUT" else sha256("fund_wallet"),
            "disaster_event_id": disaster_id,
            "open_payments_payment_id": f"op_{new_uuid()[:12]}",
            "status": weighted_choice(statuses, status_weights[tx_type]),
            "metadata": json.dumps({"source": "mock_generator", "batch": "initial"}),
            "created_at": fmt_dt(created),
        })
    return rows


def generate_claims(n: int = 2000, disaster_ids: list[str] = []) -> list[dict]:
    """Generate claims with realistic AI pipeline status distribution."""
    rows = []
    # Status distribution: mostly through the pipeline
    status_weights = [0.05, 0.03, 0.15, 0.07, 0.35, 0.10, 0.08, 0.07, 0.10]
    
    descriptions = [
        "Flood water entered my house, about 2 feet deep. Furniture and appliances damaged.",
        "Earthquake caused cracks in walls and ceiling. Roof partially collapsed.",
        "Wildfire destroyed the shed and damaged the main house exterior.",
        "Typhoon blew off the roof and flooded the ground floor.",
        "Landslide blocked the road and damaged the foundation of our house.",
        "Flash flood swept away our stored goods and damaged the kitchen.",
        "Strong winds from the storm broke windows and uprooted trees onto our car.",
        "Volcanic ash covered the crops and the roof is sagging from the weight.",
        "Flooding contaminated our water supply. Need emergency water and sanitation.",
        "Earthquake aftershock worsened existing structural damage. Building condemned.",
    ]

    for _ in range(n):
        created = random_dt()
        status = weighted_choice(CLAIM_STATUSES, status_weights)
        has_review = status in ("APPROVED", "DENIED_BY_HUMAN", "PAID")
        has_ai = status not in ("SUBMITTED",)
        confidence = round(random.uniform(0.60, 0.99), 2) if has_ai else None

        rows.append({
            "id": new_uuid(),
            "claimant_id_hash": sha256(f"claimant_{random.randint(1, 300)}"),
            "claimant_wallet_hash": sha256(f"wallet_{random.randint(1, 300)}"),
            "disaster_event_id": random.choice(disaster_ids) if disaster_ids else new_uuid(),
            "description": random.choice(descriptions),
            "image_url": f"https://storage.example.com/claims/{new_uuid()[:8]}.jpg",
            "ai_recommendation": weighted_choice(AI_DECISIONS_REC, [0.60, 0.25, 0.15]) if has_ai else "",
            "ai_recommendation_confidence": f"{confidence}" if confidence else "",
            "ai_critic_validation": weighted_choice(AI_DECISIONS_CRITIC, [0.80, 0.20]) if has_ai else "",
            "ai_critic_confidence": f"{round(confidence - random.uniform(0, 0.05), 2)}" if confidence else "",
            "status": status,
            "reviewer_id_hash": sha256(f"collector_{random.randint(1, 10)}") if has_review else "",
            "reviewed_at": fmt_dt(created + timedelta(hours=random.randint(1, 48))) if has_review else "",
            "payout_amount": f"{random_amount(50, 500):.4f}" if status == "PAID" else "",
            "payout_transaction_id": new_uuid() if status == "PAID" else "",
            "retry_count": str(random.randint(0, 3)) if status in ("AI_ERROR", "AI_TIMEOUT") else "0",
            "metadata": json.dumps({"source": "mock_generator"}),
            "created_at": fmt_dt(created),
            "updated_at": fmt_dt(created + timedelta(hours=random.randint(0, 72))),
        })
    return rows


def generate_ai_inferences(claims: list[dict]) -> list[dict]:
    """Generate recommender + critic inference for each non-SUBMITTED claim."""
    rows = []
    reasonings_rec = [
        "Visible water damage above 1 foot matches the flood claim. Damage consistent with reported severity level.",
        "Structural cracks visible in submitted photo. Consistent with earthquake damage patterns.",
        "Burn marks and charred materials visible. Consistent with wildfire damage claim.",
        "Image shows roof damage and debris consistent with typhoon wind damage.",
        "No visible damage detected in the submitted image. Claim details do not match visual evidence.",
        "Moderate damage visible but below the severity threshold for the claimed disaster category.",
        "Evidence is ambiguous. Some damage visible but cannot confirm correlation with the reported disaster event.",
        "Significant structural damage confirmed. Multiple matched rules indicate high-severity case.",
    ]
    critiques = [
        "Recommendation is consistent with visible evidence. No bias detected.",
        "Reasoning is sound. Confidence level appropriately calibrated for the damage shown.",
        "Minor concern: the lighting in the image makes damage assessment less certain. Slightly reduced confidence.",
        "Recommendation aligns with community rules. No logical inconsistencies found.",
        "Challenge: the image quality is poor and the reasoning may overstate the visible damage.",
        "Challenge: recommendation confidence seems too high given the ambiguous visual evidence.",
    ]

    for claim in claims:
        if claim["status"] == "SUBMITTED":
            continue

        claim_id = claim["id"]
        created = datetime.strptime(claim["created_at"], "%Y-%m-%d %H:%M:%S")

        # Recommender
        rec_decision = claim["ai_recommendation"] or weighted_choice(AI_DECISIONS_REC, [0.60, 0.25, 0.15])
        rec_conf = float(claim["ai_recommendation_confidence"]) if claim["ai_recommendation_confidence"] else round(random.uniform(0.60, 0.99), 2)
        rec_time = random.randint(800, 4500)

        rec_output = {
            "decision": rec_decision,
            "confidence_score": rec_conf,
            "reasoning": random.choice(reasonings_rec),
            "matched_rules": random.sample(["flood_damage_visual_confirmation", "severity_threshold_met",
                                             "earthquake_structural_check", "fire_damage_detection",
                                             "wind_damage_assessment"], k=random.randint(1, 3)),
            "risk_flags": random.sample(["low_image_quality", "duplicate_claim_suspected", "unusual_timing"], k=random.randint(0, 1)),
        }

        rows.append({
            "id": new_uuid(),
            "claim_id": claim_id,
            "agent_type": "RECOMMENDER",
            "model": "gemini-2.5-flash",
            "input_text": claim["description"],
            "input_image_url": claim["image_url"],
            "raw_response": json.dumps({"candidates": [{"content": rec_output}]}),
            "output_json": json.dumps(rec_output),
            "decision": rec_decision,
            "confidence_score": str(rec_conf),
            "processing_time_ms": str(rec_time),
            "error": "",
            "created_at": fmt_dt(created + timedelta(seconds=random.randint(1, 60))),
        })

        # Critic
        critic_val = claim["ai_critic_validation"] or weighted_choice(AI_DECISIONS_CRITIC, [0.80, 0.20])
        critic_conf = float(claim["ai_critic_confidence"]) if claim["ai_critic_confidence"] else round(rec_conf - random.uniform(0, 0.05), 2)
        critic_time = random.randint(600, 3500)

        critic_output = {
            "validation": critic_val,
            "issues_found": [] if critic_val == "CONCUR" else [random.choice(["overconfident_reasoning", "image_quality_concern", "rule_mismatch"])],
            "revised_confidence": critic_conf,
            "critique": random.choice(critiques),
        }

        rows.append({
            "id": new_uuid(),
            "claim_id": claim_id,
            "agent_type": "CRITIC",
            "model": "gemini-2.5-flash",
            "input_text": json.dumps(rec_output),
            "input_image_url": claim["image_url"],
            "raw_response": json.dumps({"candidates": [{"content": critic_output}]}),
            "output_json": json.dumps(critic_output),
            "decision": critic_val,
            "confidence_score": str(critic_conf),
            "processing_time_ms": str(critic_time),
            "error": "",
            "created_at": fmt_dt(created + timedelta(seconds=random.randint(61, 120))),
        })

    return rows


def generate_governance_proposals(n: int = 50, disaster_ids: list[str] = []) -> list[dict]:
    """Generate governance proposals."""
    rows = []
    rule_fields = ["min_ai_confidence", "max_payout_per_recipient", "distribution_model",
                   "min_disaster_severity", "reserve_percentage"]
    
    for _ in range(n):
        created = random_dt()
        field = random.choice(rule_fields)
        
        if field == "min_ai_confidence":
            proposed = str(round(random.uniform(0.70, 0.95), 2))
            current = "0.85"
        elif field == "max_payout_per_recipient":
            proposed = str(random.choice([250, 500, 750, 1000]))
            current = "500"
        elif field == "distribution_model":
            proposed = random.choice(["equal_split", "severity_based", "household_weighted", "capped"])
            current = "severity_based"
        elif field == "min_disaster_severity":
            proposed = str(random.randint(1, 5))
            current = "3"
        else:
            proposed = str(round(random.uniform(0.05, 0.25), 2))
            current = "0.10"
        
        votes_for = random.randint(0, 200)
        votes_against = random.randint(0, 200)
        status = "PASSED" if votes_for > votes_against and random.random() < 0.4 else \
                 "REJECTED" if votes_against > votes_for and random.random() < 0.3 else "ACTIVE"

        rows.append({
            "id": new_uuid(),
            "proposer_id_hash": sha256(f"donor_{random.randint(1, 500)}"),
            "title": f"Change {field.replace('_', ' ').title()} to {proposed}",
            "description": f"Proposal to update {field} from {current} to {proposed} based on community feedback.",
            "rule_field": field,
            "proposed_value": proposed,
            "current_value": current,
            "votes_for": str(votes_for),
            "votes_against": str(votes_against),
            "status": status,
            "expires_at": fmt_dt(created + timedelta(days=14)),
            "resolved_at": fmt_dt(created + timedelta(days=random.randint(1, 14))) if status != "ACTIVE" else "",
            "created_at": fmt_dt(created),
        })
    return rows


def generate_governance_votes(n: int = 5000, proposal_ids: list[str] = []) -> list[dict]:
    """Generate votes linked to proposals."""
    rows = []
    for _ in range(n):
        rows.append({
            "id": new_uuid(),
            "proposal_id": random.choice(proposal_ids) if proposal_ids else new_uuid(),
            "voter_id_hash": sha256(f"donor_{random.randint(1, 500)}"),
            "vote": weighted_choice(["FOR", "AGAINST"], [0.6, 0.4]),
            "created_at": fmt_dt(random_dt()),
        })
    return rows


def generate_events_log(n: int = 15000) -> list[dict]:
    """Generate system event log entries."""
    rows = []
    error_messages = [
        None, None, None, None, None,  # mostly no errors
        "ClickHouse connection timeout after 5000ms",
        "Gemini API returned 429 Too Many Requests",
        "Open Payments grant creation failed: invalid wallet address",
        "Unexpected JSON parse error in AI response",
        "Fund balance insufficient for payout",
    ]

    for _ in range(n):
        event_type = random.choice(EVENT_TYPES)
        service = random.choice(SERVICES)
        error = random.choice(error_messages)
        created = random_dt()

        payload = {
            "action": f"{service}_{event_type.lower()}",
            "request_id": new_uuid()[:8],
            "duration_ms": random.randint(5, 8000),
        }

        rows.append({
            "id": new_uuid(),
            "event_type": event_type,
            "service": service,
            "payload": json.dumps(payload),
            "error": error or "",
            "created_at": fmt_dt(created),
        })
    return rows


# ---------------------------------------------------------------------------
# CSV writer
# ---------------------------------------------------------------------------

def write_csv(filename: str, rows: list[dict]) -> Path:
    """Write rows to a CSV file in the mock_data directory."""
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    path = CSV_DIR / filename
    if not rows:
        print(f"  ⚠️  No data for {filename}, skipping.")
        return path
    keys = rows[0].keys()
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✅  {filename}: {len(rows):,} rows")
    return path


# ---------------------------------------------------------------------------
# ClickHouse push
# ---------------------------------------------------------------------------

def push_to_clickhouse(csv_files: dict[str, Path]):
    """Push all CSV files to ClickHouse with proper type coercion."""
    try:
        import clickhouse_connect
    except ImportError:
        print("\n❌  clickhouse-connect not installed. Run: pip install clickhouse-connect")
        sys.exit(1)

    load_dotenv(PROJECT_ROOT / ".env")

    ch_url = os.getenv("CLICKHOUSE_URL", "http://localhost:8123")
    database = os.getenv("CLICKHOUSE_DATABASE", "daddes_fund")
    username = os.getenv("CLICKHOUSE_USERNAME", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")

    # Parse host/port from URL
    from urllib.parse import urlparse
    parsed = urlparse(ch_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or (8443 if parsed.scheme == "https" else 8123)
    secure = parsed.scheme == "https"

    print(f"\n🔌  Connecting to ClickHouse at {host}:{port} (secure={secure}) …")

    client = clickhouse_connect.get_client(
        host=host,
        port=port,
        database=database,
        username=username,
        password=password,
        secure=secure,
    )

    # Verify connection
    result = client.query("SELECT 1")
    print("✅  Connected.\n")

    # Get column types from ClickHouse for smart coercion
    def get_column_types(table: str) -> dict[str, str]:
        """Fetch column name → type mapping from ClickHouse."""
        res = client.query(f"DESCRIBE TABLE {table}")
        return {row[0]: row[1] for row in res.result_rows}

    def coerce_value(val: str, ch_type: str):
        """Convert a CSV string value to the appropriate Python type."""
        # Handle empty strings as None for Nullable types
        if "Nullable" in ch_type and (val == "" or val is None):
            return None

        # UUID — keep as string
        if "UUID" in ch_type:
            return val if val else None if "Nullable" in ch_type else "00000000-0000-0000-0000-000000000000"

        # DateTime
        if "DateTime" in ch_type:
            if not val:
                return None if "Nullable" in ch_type else datetime(2026, 1, 1)
            return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")

        # Date
        if ch_type == "Date":
            if not val:
                return None if "Nullable" in ch_type else datetime(2026, 1, 1).date()
            return datetime.strptime(val, "%Y-%m-%d").date()

        # Numeric types
        if "Decimal" in ch_type:
            return float(val) if val else 0.0
        if "Float" in ch_type:
            if not val:
                return None if "Nullable" in ch_type else 0.0
            return float(val)
        if "UInt" in ch_type or "Int" in ch_type:
            if not val:
                return None if "Nullable" in ch_type else 0
            return int(val)

        # String types (LowCardinality, Nullable(String), String)
        return val if val is not None else ""

    # Insert each CSV with type coercion
    for table_name, csv_path in csv_files.items():
        if not csv_path.exists():
            print(f"  ⚠️  {csv_path} not found, skipping {table_name}.")
            continue

        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            rows_raw = list(reader)

        if not rows_raw:
            print(f"  ⚠️  {table_name}: no rows, skipping.")
            continue

        columns = list(rows_raw[0].keys())

        # Fetch ClickHouse column types for this table
        try:
            col_types = get_column_types(table_name)
        except Exception as e:
            print(f"  ⚠️  Cannot describe {table_name}: {e}, skipping.")
            continue

        # Coerce each row
        data = []
        for row in rows_raw:
            coerced = []
            for col in columns:
                ch_type = col_types.get(col, "String")
                coerced.append(coerce_value(row[col], ch_type))
            data.append(coerced)

        print(f"  → Inserting {len(data):,} rows into {table_name}…", end=" ", flush=True)
        try:
            client.insert(table_name, data, column_names=columns)
            print("✅")
        except Exception as e:
            print(f"❌  {e}")

    print("\n🎉  Push complete.\n")
    client.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate mock data for Dadde's Fund ClickHouse tables")
    parser.add_argument("--push", action="store_true", help="Push generated CSVs to ClickHouse after generation")
    parser.add_argument("--transactions", type=int, default=10000, help="Number of transactions (default: 10000)")
    parser.add_argument("--claims", type=int, default=2000, help="Number of claims (default: 2000)")
    parser.add_argument("--events", type=int, default=15000, help="Number of event log entries (default: 15000)")
    parser.add_argument("--votes", type=int, default=5000, help="Number of governance votes (default: 5000)")
    args = parser.parse_args()

    print("\n📊  Dadde's Fund Mock Data Generator")
    print("=" * 50)
    print(f"  Transactions:  {args.transactions:,}")
    print(f"  Claims:        {args.claims:,}")
    print(f"  Events log:    {args.events:,}")
    print(f"  Votes:         {args.votes:,}")
    print(f"  Date range:    {fmt_date(START_DATE)} → {fmt_date(NOW)}")
    print("=" * 50)

    random.seed(42)  # Reproducible data

    # 1. Disaster events (generate first — other tables reference these)
    print("\n🌍  Generating disaster events …")
    disasters = generate_disaster_events(20)
    disaster_ids = [d["id"] for d in disasters]
    write_csv("disaster_events.csv", disasters)

    # 2. Transactions
    print("\n💰  Generating transactions …")
    transactions = generate_transactions(args.transactions, disaster_ids)
    write_csv("transactions.csv", transactions)

    # 3. Claims
    print("\n📋  Generating claims …")
    claims = generate_claims(args.claims, disaster_ids)
    write_csv("claims.csv", claims)

    # 4. AI Inferences (derived from claims)
    print("\n🤖  Generating AI inferences …")
    inferences = generate_ai_inferences(claims)
    write_csv("ai_inferences.csv", inferences)

    # 5. Governance proposals
    print("\n🗳️   Generating governance proposals …")
    proposals = generate_governance_proposals(50, disaster_ids)
    proposal_ids = [p["id"] for p in proposals]
    write_csv("governance_proposals.csv", proposals)

    # 6. Governance votes
    print("\n🗳️   Generating governance votes …")
    votes = generate_governance_votes(args.votes, proposal_ids)
    write_csv("governance_votes.csv", votes)

    # 7. Events log
    print("\n📝  Generating events log …")
    events = generate_events_log(args.events)
    write_csv("events_log.csv", events)

    # 8. Community rules (just the seed row)
    print("\n⚙️   Generating community rules seed …")
    rules = [{
        "version": "1",
        "min_ai_confidence": "0.85",
        "max_payout_per_recipient": "500.0000",
        "distribution_model": "severity_based",
        "min_disaster_severity": "3",
        "reserve_percentage": "0.10",
        "updated_by": "system",
        "updated_at": fmt_dt(NOW),
    }]
    write_csv("community_rules.csv", rules)

    # Summary
    total_csvs = sum(1 for f in CSV_DIR.glob("*.csv"))
    total_rows = (len(disasters) + len(transactions) + len(claims) +
                  len(inferences) + len(proposals) + len(votes) +
                  len(events) + len(rules))
    print(f"\n{'=' * 50}")
    print(f"✅  Generated {total_csvs} CSV files with {total_rows:,} total rows")
    print(f"📁  Output: {CSV_DIR}/")
    print(f"{'=' * 50}")

    # Push if requested
    if args.push:
        csv_files = {
            "disaster_events": CSV_DIR / "disaster_events.csv",
            "transactions": CSV_DIR / "transactions.csv",
            "claims": CSV_DIR / "claims.csv",
            "ai_inferences": CSV_DIR / "ai_inferences.csv",
            "governance_proposals": CSV_DIR / "governance_proposals.csv",
            "governance_votes": CSV_DIR / "governance_votes.csv",
            "events_log": CSV_DIR / "events_log.csv",
            "community_rules": CSV_DIR / "community_rules.csv",
        }
        push_to_clickhouse(csv_files)
    else:
        print(f"\n💡  To push to ClickHouse, run:")
        print(f"    python scripts/generate_mock_data.py --push\n")


if __name__ == "__main__":
    main()
