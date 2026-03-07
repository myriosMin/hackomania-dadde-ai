# Dadde's Fund: AI-Mediated Decentralized Community Aid (PRD)

This Product Requirements Document is designed explicitly for an **AI Developer Agent** to implement the HackOMania hackathon winning project. The architecture is scoped to maximize the judging rubric (Impact 30%, Relevance 15%, Complexity 20%, Execution 35%) plus the ClickHouse special challenge rubric (Effective Use 35pts, Architecture 25pts, Innovation 20pts) by utilizing **Interledger Open Payments**, **ClickHouse**, and **Gemini 2.0 Flash** multimodal AI.

---

## The Goal

Build a working, end-to-end prototype of a digital ROSCA (community emergency fund) platform that:

1. Collects continuous micro-contributions via **Open Payments** (direct donations, subscription pledges, vendor round-ups).
2. Detects disaster events and identifies affected communities.
3. Evaluates emergency claims using a dual-AI verification pipeline (Recommendation Agent + Critic Agent) against **community-voted rules and thresholds** — the AI never sets thresholds or makes decisions, only advises.
4. Logs all AI reasoning transparently to **ClickHouse** as an immutable, anonymized audit trail.
5. Requires **human-in-the-loop approval** before any payout executes.
6. Triggers instant payouts via **Open Payments** with proper IDP authorization redirect flow.
7. Displays a real-time transparency dashboard (powered by ClickHouse Materialized Views) showing fund health, impact metrics, and AI decision ratios — all with **recipient anonymization**.

---

## 🏗 System Architecture & Golden Path Demo

### The Core Demo Flow (2 minutes)

| Step | Action | Tech |
|------|--------|------|
| 1 | Donor A contributes $5.00 via Open Payments wallet. IDP redirect confirms consent, then redirects back to platform. Transaction visible in test wallet. | Open Payments SDK + IDP redirect |
| 2 | A disaster strikes. User B uploads a photo of property damage + a short text claim via the mobile-first claim form. | Next.js frontend |
| 3 | **AI Recommendation Agent** (Gemini 2.0 Flash) evaluates multimodal input against community-defined rules. Outputs structured JSON verdict. | Gemini 2.0 Flash API |
| 4 | **AI Critic Agent** reviews the Recommendation Agent's output for errors, bias, or hallucinations. Outputs a validation report. Both are logged to ClickHouse. | Gemini 2.0 Flash API + ClickHouse |
| 5 | A Collector/Admin reviews the AI recommendation + critic report and **manually approves** the payout. | Platform admin UI |
| 6 | System executes payout via Open Payments (grant → quote → outgoing payment) to User B's wallet. IDP authorization completes the flow. Transaction visible in test wallet. | Open Payments SDK |

### The "Wow" Factor: Transparency Dashboard (ClickHouse)

- A real-time dashboard querying ClickHouse Materialized Views.
- During the demo, a background script fires **5,000 mock historical transactions** to prove ClickHouse is used for real-time analytics (SummingMergeTree, Materialized Views) — not as a basic SQL database.
- Dashboard shows: Fund balance, AI approval/escalation ratios, regional disaster distribution, contribution velocity — all with **anonymized recipient data**.

---

## 👥 User Types

### 1. Donors
Entities who contribute money to the community fund.
- Individuals, businesses, vendors.
- Contribute via: direct donations, subscription pledges, round-up micro-donations.
- Can configure **donation preferences** (disaster types, geographic regions, spending limits).

### 2. Collectors (Platform Moderators)
Platform operators/administrators responsible for:
- Managing the community fund.
- Reviewing AI recommendations before approving payouts (**human-in-the-loop**).
- Maintaining transparency and ensuring payouts follow community-voted rules.
- They are governance moderators, **not** unilateral decision-makers.

### 3. Receivers
Entities receiving emergency payouts.
- Individuals affected by disasters, NGOs, relief organizations, community groups.
- Must have an Open Payments wallet.
- Their **identity is protected** — the platform never publicly exposes who received aid.

---

## 💰 Funding Mechanisms (All via Open Payments)

### 1. Direct Donations
Users manually donate through the platform.
- Example: "Donate $10 to current disaster" or "Donate $5 monthly."
- Uses Open Payments: Grant request → IDP consent → Incoming payment on fund wallet.

### 2. Round-Up Micro-Donations (Vendor Integration)
Supported vendors (e.g., kopi stalls, fast food) integrate Open Payments at checkout.
- Example: Coffee = $2.70 → Round up to $3.00 → $0.30 donation.
- User sees: *"Round up your purchase to support disaster relief?"*
- User must explicitly **approve** via IDP consent redirect. No blind donations.
- After payment, user is redirected back to the vendor page.

### 3. Subscription / Pledged Contributions
Users pledge a monthly amount. Round-up micro-donations are tracked and **subtracted** from the pledge.
- Example: Pledge = $20/month, round-ups during month = $6.80, end-of-month charge = $13.20.
- Implemented as recurring Open Payments grants with `interval` and `debitAmount`.

### 4. Disaster-Mode Surge Donations
When a disaster is active:
- Donations are prioritized toward that event.
- Platform may trigger special donation drives.
- Subscription donations can optionally auto-route toward the active disaster.

---

## 🌍 Donor Preferences

Donors can configure where their money goes. This is a **donor-side preference**, not a claim-side filter.

### Disaster Type Preferences
- Floods, Earthquakes, Wildfires, Typhoons, All disasters (default).

### Geographic Region Preferences
- Global (default), Asia, Southeast Asia, Singapore-only, specific countries.
- Example: A donor in Singapore might prefer their contributions prioritize Singapore-region disasters over others.
- This does **not** prevent other disasters from being funded — it influences allocation weighting.

### Spending Limits
- Round-up limit per transaction.
- Daily/weekly/monthly micro-donation caps.
- Subscription pledge amount.

---

## 🔍 Disaster Detection & Payout Decision Pipeline

This is a **five-layer hybrid system**. The AI never makes the final call — it only advises.

### Layer 1: Disaster Detection
External data triggers a disaster event.
- Sources: News feeds, disaster APIs (e.g., GDACS, USGS), government alerts.
- The platform can also allow manual disaster creation by Collectors.

### Layer 2: Predefined Community Rules (Thresholds)
Rules are **defined by the community through voting**, not by AI. Examples:
- Minimum disaster severity to trigger fund activation.
- Maximum payout per recipient.
- Payout distribution model: equal split, severity-based, household-size weighted, capped.
- Minimum fund balance to maintain as reserve.
- Minimum confidence score from AI to proceed to human review (e.g., 0.85).

> **Critical Design Decision:** The AI confidence threshold (e.g., 0.85) is a community-voted default stored in the rules table. The AI process never modifies it. The community can adjust it via the governance voting mechanism.

### Layer 3: AI Recommendation Agent (Gemini 2.0 Flash)
Evaluates a claim (image + text) against the community-defined rules.
- Input: Base64 image of disaster damage + textual claim description + community rule context.
- Output (strict JSON):
  ```json
  {
    "decision": "RECOMMEND_APPROVE" | "RECOMMEND_DENY" | "RECOMMEND_ESCALATE",
    "confidence_score": 0.92,
    "reasoning": "Visible water damage above 1 foot matches the flood claim. Damage consistent with reported severity level.",
    "matched_rules": ["flood_damage_visual_confirmation", "severity_threshold_met"],
    "risk_flags": []
  }
  ```
- This is a **recommendation**, not a final decision.

### Layer 4: AI Critic Agent (Gemini 2.0 Flash)
A second AI call that reviews the Recommendation Agent's output.
- Checks for: logical errors, bias, hallucinated reasoning, inconsistencies with the image.
- Output:
  ```json
  {
    "validation": "CONCUR" | "CHALLENGE",
    "issues_found": [],
    "revised_confidence": 0.90,
    "critique": "Recommendation is consistent with visible evidence. No bias detected."
  }
  ```
- Both the recommendation and critique are logged to the `ai_inferences` ClickHouse table.

### Layer 5: Human-in-the-Loop Approval
A Collector/Admin reviews:
- The original claim (image + text).
- The AI Recommendation Agent's verdict.
- The AI Critic Agent's validation.
- The applicable community rules.

They then **manually approve or reject** the payout. Only after human approval does the Open Payments payout execute.

**Error Handling:**
- If the Gemini API times out or fails → claim is flagged as `ai_error`, queued for retry (max 3 retries with exponential backoff), then escalated to human-only review.
- If the Critic Agent disagrees with the Recommendation Agent → claim auto-escalated to `needs_review` with both opinions shown to the Collector.

---

## 🗳 Community Governance

### Voting Mechanism
Community members (donors with active contributions) can vote on:
- **Payout rules**: distribution model (equal split vs. severity-based), maximum per-recipient cap.
- **Thresholds**: minimum AI confidence to proceed to human review, minimum disaster severity.
- **Disaster prioritization**: which active disaster should receive the most allocation.
- **Rule proposals**: any member can propose a rule change; passes with majority vote.

### Implementation
- Votes stored in ClickHouse `governance_votes` table.
- Active rules stored in a `community_rules` table with version history.
- Current rules are read at claim evaluation time and passed as context to the AI agents.
- Simple majority voting for the hackathon scope. DAO-style weighted voting is future work.

---

## 🔒 Privacy Design

### Principles
1. **Recipient anonymity**: The dashboard **never** shows who received payouts. Only aggregate data is displayed (e.g., "12 payouts totaling $480 disbursed for Singapore Flood 2026").
2. **Claim privacy**: Claim images and text are only visible to the AI agents and the Collector reviewing the claim. They are **not** displayed on public dashboards.
3. **Donor transparency, recipient opacity**: Donors can optionally appear on leaderboards (opt-in). Recipients are always anonymous.
4. **Data minimization**: The platform stores only the minimum data needed. Claim images are processed by the AI and then stored in a non-public bucket — never on the dashboard.
5. **Consent-based data handling**: All Open Payments transactions require explicit IDP consent. No silent withdrawals.

### ClickHouse Implementation
- The `transactions` table stores payout records with a **hashed recipient ID**, not a wallet address or name.
- Dashboard queries aggregate by disaster event, region, and time — never by individual recipient.
- The `ai_inferences` table stores reasoning logs but the claim image URL is access-controlled (not publicly queryable via the dashboard API).

---

## 🛠 Required Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (React), TailwindCSS, Recharts |
| Backend API | Node.js + Express |
| AI (Multimodal) | Gemini 2.0 Flash API (cheapest multimodal, sufficient for image+text) |
| Database (Analytics + Audit) | ClickHouse (Cloud or Local) |
| Payments | Interledger Open Payments SDK / Rafiki APIs |
| Auth/Consent | Open Payments IDP redirect flow (test wallet) |

---

## 🤖 Implementation Steps for AI Developer

*Agent Instruction: Implement each step fully before moving to the next. Handle errors at every integration point. Test your logic where possible. End every completed step with the exact `git commit` message provided.*

---

### Step 1: Project Scaffolding

- Initialize a monolithic repo with a `frontend` (Next.js) and `backend` (Express) folder.
- Set up TailwindCSS in the frontend with a modern UI component library (shadcn/ui or similar).
- Set up basic health-check routing in the Express backend.
- Create a shared `config/` module for environment variables (API keys, ClickHouse connection, Open Payments wallet addresses).

**Error Handling:**
- Health check endpoint should verify backend is live and return version info.
- Environment variable validation on startup — fail fast with clear error messages if keys are missing.

> 📌 `git commit -m "feat: initialize project scaffolding for Next.js and Express"`

---

### Step 2: ClickHouse Foundation & Schema

Set up `@clickhouse/client` in the backend. Write a migration script creating these tables:

| Table | Engine | Purpose |
|-------|--------|---------|
| `events_log` | MergeTree | Append-only log of every system event (API calls, errors, state transitions) |
| `transactions` | MergeTree | All incoming contributions and outgoing payouts. Payout records use **hashed recipient IDs** (never wallet addresses). |
| `ai_inferences` | MergeTree | AI Recommendation Agent input/output + AI Critic Agent input/output. Image URLs are access-controlled. |
| `governance_votes` | MergeTree | Community votes on rules, thresholds, and disaster prioritization. |
| `community_rules` | ReplacingMergeTree | Current active rules with version history. Versioned by `updated_at`. |
| `fund_metrics` | SummingMergeTree | Pre-aggregated fund balance and daily transaction volumes. |
| `disaster_events` | MergeTree | Registered disaster events with severity, region, status. |

Create a **Materialized View** that automatically pre-aggregates from `transactions` into `fund_metrics`. This is critical for the real-time dashboard and proves ClickHouse is used for analytics, not just storage.

**Error Handling:**
- Wrap all ClickHouse writes in try/catch. On failure, log to stderr and queue for retry.
- Migration script should be idempotent (check if tables exist before creating).
- Add a `GET /api/health/clickhouse` endpoint that verifies ClickHouse connectivity.

> 📌 `git commit -m "feat: setup ClickHouse schema with MergeTree, SummingMergeTree, and Materialized Views"`

---

### Step 3: Open Payments Foundation

Implement the **real** Open Payments flow using the Open Payments SDK against the test wallet (`wallet.interledger-test.dev`). **No mocking of payment flows.** This is a critical judging criterion.

#### 3a. Contribution Flow (Inbound)
`POST /api/payments/contribute`
1. Create an **incoming payment** on the fund's wallet (specifying amount).
2. Request a **grant** from the donor's authorization server.
3. **Redirect the donor to the IDP** for consent.
4. On approval, IDP **redirects back to the platform** with the grant token.
5. Execute the payment using the grant.
6. Log transaction to ClickHouse `transactions` table.
7. Verify transaction appears in the test wallet.

#### 3b. Payout Flow (Outbound)
`POST /api/payments/payout`
1. Using the approved claim data, create a **quote** for the payout amount.
2. Request a **grant** from the fund wallet's authorization server.
3. Create an **outgoing payment** using the quote and grant.
4. Log transaction to ClickHouse `transactions` table with **hashed recipient ID**.
5. Verify transaction appears in the test wallet.

#### 3c. Subscription / Recurring Contributions
`POST /api/payments/subscribe`
- Create a recurring grant with `interval` (e.g., `R/2026-03-01T00:00:00Z/P1M`) and `debitAmount` limit.
- Track round-up micro-donations against the pledge and charge the remainder at interval end.

**Error Handling:**
- If IDP redirect fails or user denies consent → return user to platform with clear "Payment cancelled" message. Log event.
- If grant creation fails → retry once, then show error to user with a "Try again" button.
- If outgoing payment fails → log error, set payout status to `payment_failed`, alert Collector.
- If fund balance is insufficient for payout → reject payout, set status to `insufficient_funds`, notify Collector.
- Always validate that the payout amount ≤ available fund balance *before* initiating the grant.

> 📌 `git commit -m "feat: implement Open Payments SDK with IDP redirect for contributions and payouts"`

---

### Step 4: Community Governance Module

#### 4a. Rules Engine
`GET /api/rules` — Returns current active community rules from ClickHouse `community_rules` table.

Default rules (seeded on first run):
```json
{
  "min_ai_confidence": 0.85,
  "max_payout_per_recipient": 500,
  "distribution_model": "severity_based",
  "min_disaster_severity": 3,
  "reserve_percentage": 0.10,
  "version": 1
}
```

#### 4b. Voting API
- `POST /api/governance/propose` — Submit a rule change proposal.
- `POST /api/governance/vote` — Cast a vote (one vote per donor per proposal).
- `GET /api/governance/proposals` — List active proposals with vote counts.
- When a proposal reaches majority → update `community_rules` with new version.

**Error Handling:**
- Prevent double voting (check ClickHouse before accepting).
- Validate proposal values (e.g., `min_ai_confidence` must be between 0.0 and 1.0).
- If ClickHouse write fails during vote → return error, do not silently drop the vote.

> 📌 `git commit -m "feat: implement community governance with voting and configurable rules"`

---

### Step 5: The Dual-AI Verification Module

#### 5a. AI Recommendation Agent
Create `services/aiRecommender.js`:
- Few-shot prompt that intakes: Base64 image + text claim + current community rules (from Step 4).
- Forces Gemini 2.0 Flash to output strict JSON (see Layer 3 format above).
- Log full input/output to ClickHouse `ai_inferences` table with `agent_type = 'recommender'`.

#### 5b. AI Critic Agent
Create `services/aiCritic.js`:
- Takes the Recommendation Agent's output + the original image + claim text.
- Evaluates for: logical errors, bias, hallucinated reasoning, consistency with visual evidence.
- Forces Gemini 2.0 Flash to output strict JSON (see Layer 4 format above).
- Log full input/output to ClickHouse `ai_inferences` table with `agent_type = 'critic'`.

**Error Handling:**
- If Gemini API returns a non-JSON response → parse error, retry once with stricter prompt. If still fails, flag claim as `ai_parse_error` and escalate to human-only review.
- If Gemini API times out (>10s) → retry with exponential backoff (max 3 attempts). After 3 failures, flag as `ai_timeout` and escalate to human-only review.
- If Gemini API returns a 429 (rate limit) → queue the claim for delayed processing, notify Collector.
- Always log the raw API response to `events_log` even on failure — this is the audit trail.

> 📌 `git commit -m "feat: build dual-AI claim verification pipeline with ClickHouse audit logging"`

---

### Step 6: Core Workflow Integration (The Golden Path)

Create the master backend route: `POST /api/claims/submit`

**Flow:**
1. Accept image (multipart) + text claim + claimant wallet address.
2. Validate inputs (image size ≤ 5MB, text ≤ 2000 chars, wallet address format).
3. Call AI Recommendation Agent (Step 5a).
4. Call AI Critic Agent with recommendation output (Step 5b).
5. Determine claim status:
   - If Recommender says `RECOMMEND_APPROVE` AND Critic says `CONCUR` AND `confidence_score ≥ community_rules.min_ai_confidence` → status = `pending_human_approval`.
   - If Critic says `CHALLENGE` → status = `needs_review` (flagged).
   - If Recommender says `RECOMMEND_DENY` → status = `denied_by_ai` (Collector can still override).
   - If Recommender says `RECOMMEND_ESCALATE` → status = `escalated`.
6. Store claim state in ClickHouse `transactions` table.
7. **Do NOT auto-execute payout.** All approved claims wait for Collector approval (Step 7).

Create admin route: `POST /api/claims/:id/approve`
- Collector reviews and approves → triggers `POST /api/payments/payout` (Step 3b).
- Collector reviews and rejects → updates status to `denied_by_human`.

**Error Handling:**
- If input validation fails → return 400 with specific field errors.
- If ClickHouse write fails for claim state → retry, then return 503 with "Please try again."
- Race condition protection: Before executing payout, re-check fund balance. Use optimistic locking (check balance → execute → verify deduction).
- If two claims are approved simultaneously and the fund can only cover one → process by submission timestamp order, reject the second with `insufficient_funds`.

> 📌 `git commit -m "feat: integrate E2E claim workflow with dual-AI verification and human approval gate"`

---

### Step 7: Frontend — Admin & Transparency Dashboard

#### 7a. Transparency Dashboard (Public)
Build a real-time dashboard UI polling `GET /api/metrics`.
- Backend queries ClickHouse Materialized Views for lightning-fast aggregates.
- Displays:
  - **Fund Balance** (total available, total disbursed, reserve amount).
  - **AI Decision Ratios** (approve vs. escalate vs. deny — aggregated, no individual claims).
  - **Regional Disaster Distribution** (based on tagged disaster events, not individual claim locations).
  - **Contribution Velocity** (donations per hour/day, powered by SummingMergeTree).
  - **Impact Metrics** (people helped, funds distributed, active disasters supported).
  - **Active Disaster Cards** — each disaster has a story card with description, location, severity, and aggregated fund allocation.
- Render using Recharts or Chart.js.
- **Privacy enforcement:** Dashboard API endpoints MUST NOT return individual recipient data and MUST NOT return claim images/text.

#### 7b. Collector Admin Panel
- View pending claims with AI Recommendation + Critic reports.
- One-click Approve / Reject buttons.
- View governance proposals and community vote status.

#### 7c. Leaderboard (Optional, Opt-in)
- Donors can opt into appearing on a leaderboard showing contribution totals.
- Recipients are NEVER shown.

**Error Handling:**
- If ClickHouse query fails → show cached data with a "Data may be delayed" banner.
- If metrics API is slow → implement client-side polling with a loading skeleton, not a blank screen.

> 📌 `git commit -m "feat: build real-time transparency dashboard and admin panel powered by ClickHouse"`

---

### Step 8: Frontend — Donor & Claim UIs

#### 8a. Donor Contribution Page
- Connect an Open Payments wallet (test wallet at `wallet.interledger-test.dev`).
- Direct donation flow: enter amount → IDP redirect for consent → redirect back → confirmation.
- Subscription setup: choose pledge amount + interval → IDP consent → recurring grant created.
- **Donor preferences panel**: disaster type filter, geographic region preference, spending limits.

#### 8b. Submit Claim Page
- Mobile-first form: snap/upload a photo, add a description, select the relevant disaster event.
- Real-time status updates: "Submitted → AI Reviewing → Pending Approval → Approved/Denied."
- No claim details are publicly visible. Status is shown only to the claimant.

#### 8c. Vendor Round-Up Integration (Demo)
- A mock vendor checkout page showing the round-up prompt.
- User sees: "Coffee $2.70 — Round up to $3.00 for disaster relief?"
- On accept → Open Payments IDP redirect → consent → contribution logged.

**Error Handling:**
- If wallet connection fails → show clear error with troubleshooting steps.
- If image upload exceeds size limit → show error before submission, not after.
- If claim submission fails → save draft locally, allow retry.

> 📌 `git commit -m "feat: implement donor contribution, claim submission, and vendor round-up flows"`

---

### Step 9: The Demo "Wow" Script (Final Polish)

1. Create `simulate_velocity.js` — a standalone Node script that fires **5,000 mock historical transactions**, AI inferences, governance votes, and disaster events into ClickHouse over 30 seconds.
2. Test that the Transparency Dashboard updates in real-time without lag when this script runs. This proves the architecture to the judges.
3. Ensure the UI looks premium: glassmorphism, clean fonts (Inter/Outfit from Google Fonts), dark mode, smooth micro-animations.
4. Prepare a **recorded backup demo video** in case of live demo failure (mentors explicitly recommended this).
5. Verify all Open Payments transactions are visible in the test wallet after the demo flow.

**Error Handling:**
- The simulation script should handle ClickHouse connection failures gracefully and report progress.
- Dashboard should not crash under high write load from the simulation.

> 📌 `git commit -m "chore: add telemetry simulation script, polish UI, and prepare backup demo"`

---

## ❓ Open Questions (for team discussion)

These are design decisions acknowledged but deferred for post-hackathon:

1. **Collector identity**: Are Collectors platform admins, or can communities elect their own moderators?
2. **Receiver verification**: How do we verify that a claim recipient is genuinely affected? (Mentioned as future work per mentor guidance — fraud prevention is out of scope for hackathon.)
3. **Fund custody**: Where are the pooled funds stored? A custodial Open Payments wallet for the hackathon; proper escrow for production.
4. **Weighted voting**: Should donors with higher contributions have more voting weight? (DAO-style — future work. Simple majority for hackathon.)
5. **Automated disaster triggers**: Should the platform auto-detect disasters from APIs, or only allow manual creation? (Manual for hackathon, API-based for production.)

---

## ✅ Verification Plan

### Automated / Demo Verification
- [ ] Open Payments contribution creates a visible transaction in the test wallet.
- [ ] IDP redirect flow works end-to-end (redirect out → consent → redirect back).
- [ ] AI dual-verification pipeline returns structured JSON and logs to ClickHouse.
- [ ] Human approval gate prevents auto-payout.
- [ ] Payout executes only after Collector approval and creates a visible transaction.
- [ ] Dashboard updates in real-time when `simulate_velocity.js` runs.
- [ ] Dashboard shows NO individual recipient data (privacy check).
- [ ] Governance voting changes active rules.
- [ ] Fund balance check prevents payout when insufficient.
- [ ] Error states (API timeout, payment failure) are handled gracefully with user feedback.

---

**End of PRD.** You may now begin with **Step 1**.
