# Dadde's Fund: AI-Mediated Decentralized Community Aid (PRD)

This Product Requirements Document is designed explicitly for an **AI Developer Agent** to implement the HackOMania hackathon winning project. The architecture is intentionally scoped to maximize the judging rubric (Impact, Complexity, Execution) by utilizing Interledger Open Payments, ClickHouse, and Gemini 3 Pro multimodal AI.

## The Goal
Build a working, end-to-end prototype of a digital ROSCA (community emergency fund). It accepts continuous micro-contributions, evaluates emergency claims instantly using an AI Vision agent without human bias, logs the AI reasoning transparently, and triggers instant payouts using Open Payments.

---

## 🏗 System Architecture & Golden Path Demo
1. **The Core User Flow (2 minutes to demo)**:
   - **Step 1:** User A contributes $5.00 via an Open Payments wallet (Interledger).
   - **Step 2:** A disaster strikes. User B uploads a photo of property damage and a short text claim.
   - **Step 3:** A Gemini 3 Pro agent evaluates the multimodal input against predefined community rules in less than 5 seconds.
   - **Step 4:** The AI outputs a JSON `APPROVE` decision with a confidence score and explicitly logs its "chain of thought" to ClickHouse as an immutable audit trail.
   - **Step 5:** The system automatically executes a payout via Interledger Open Payments to User B's Web Monetization wallet based on the AI approval.
2. **The "Wow" Factor Transparency Dashboard (ClickHouse)**:
   - A real-time Grafana-style dashboard querying massive data. During the demo, a background script will fire thousands of mock transactions to prove we are using ClickHouse appropriately (Materialized Views and SummingMergeTree) rather than as a basic Postgres replacement.

---

## 🛠 Required Tech Stack
- **Frontend**: Next.js (React), TailwindCSS, Recharts (for Dashboard).
- **Backend API**: Node.js + Express.
- **LLM/AI**: Google Gemini 1.5 Pro API (multimodal validation).
- **Database (The Immutable Ledger)**: ClickHouse (Cloud or Local).
- **Payments Gateway**: Interledger Open Payments SDK / Rafiki APIs.

---

## 🤖 Implementation Steps for AI Developer
*Agent Instruction: Implement each step fully before moving onto the next. Test your logic where possible. End every completed step with the exact `git commit` message provided.*

### Step 1: Project Scaffolding
- Initialize a monolithic repo with a `frontend` (Next.js) and `backend` (Express) folder.
- Set up TailwindCSS in the frontend. Ensure you are using a sleek, modern UI component library (like shadcn/ui or basic Tailwind templates).
- Set up basic health-check routing in the Express backend.
> 📌 **Commit Reminder:** `git commit -m "feat: initialize project scaffolding for Next.js and Express"`

### Step 2: ClickHouse Foundation & Telemetry Schema
- Set up the `@clickhouse/client` in the backend.
- Write a migration script that creates three primary tables:
  1. `events_log (MergeTree)`: An append-only log of every system event (api calls, errors).
  2. `transactions (MergeTree)`: Logs all incoming contributions and outgoing Interledger payouts.
  3. `ai_inferences (MergeTree)`: Logs the AI's prompt input, image URL, output JSON, confidence score, and extracted reasoning.
- Create a `fund_metrics (SummingMergeTree)` and a **Materialized View** that automatically pre-aggregates the total fund balance and daily transaction volumes from the `transactions` table. This is critical for the telemetry demo.
> 📌 **Commit Reminder:** `git commit -m "feat: setup ClickHouse schema with MergeTree and Materialized Views"`

### Step 3: Interledger Foundation (Open Payments)
- Mock out or use actual Interledger Open Payments APIs in the backend.
- Create an API route `POST /api/payments/contribute` to simulate receiving a recurring inbound Open Payment.
- Create an API route `POST /api/payments/payout` to simulate creating a quote and executing an outgoing Interledger grant for a claimant.
> 📌 **Commit Reminder:** `git commit -m "feat: implement Open Payments API bindings for pooling and payouts"`

### Step 4: The Multimodal AI Agent Module
- Implement the Gemini 1.5 Pro API in the backend.
- Create `services/aiVerifier.js` containing a few-shot prompt that intakes a Base64 image of a disaster and a textual claim description.
- Force the LLM to output a strict JSON format:
  ```json
  {
    "decision": "APPROVE" | "DENY" | "ESCALATE",
    "confidence_score": 0.95,
    "reasoning": "Visible water damage above 1 foot matches the flood claim..."
  }
  ```
- **Crucial Integration:** Pipe this JSON output immediately into the `ai_inferences` ClickHouse table.
> 📌 **Commit Reminder:** `git commit -m "feat: build multimodal AI claim verifier with ClickHouse audit logging"`

### Step 5: Core Workflow Integration (The Golden Path)
- Create the master backend route: `POST /api/claims/submit`.
- The route accepts an image and text -> calls the AI Agent (Step 4).
- If `decision === "APPROVE"` && `confidence_score > 0.85`, automatically call the Interledger payout route (Step 3).
- If `decision === "ESCALATE"` (or low confidence), log state as `pending_human`.
- Record the final state into the `transactions` ClickHouse table.
> 📌 **Commit Reminder:** `git commit -m "feat: integrate E2E claim workflow from AI verification to instant ILP payout"`

### Step 6: Frontend - The Transparency Dashboard
- Build a real-time Dashboard UI polling `GET /api/metrics`.
- The backend should query the ClickHouse `Materialized View` to return lightning-fast aggregates of Fund Balance, AI Approval vs Escalate ratios, and geographical claim velocity.
- Render these insights using modern charts (Recharts or Chart.js).
> 📌 **Commit Reminder:** `git commit -m "feat: build real-time transparency dashboard powered by ClickHouse"`

### Step 7: Frontend - Contribution & Claim UI
- Build the user-facing screens:
  - **Fund Setup Page**: Connect an Ilma/Fynbos Open Payments wallet to set up a recurring $5/week continuous sub-cent payment stream (Web Monetization).
  - **Submit Claim Page**: A mobile-first file upload form for the user to snap a photo, add a comment, and trigger the AI evaluation endpoint.
> 📌 **Commit Reminder:** `git commit -m "feat: implement user contribution and claim submission flows"`

### Step 8: The Demo "Wow" Script (Final Polish)
- Create a standalone Node script `simulate_velocity.js` that fires 5,000 mock historical transactions, AI inferences, and logs into ClickHouse over 30 seconds.
- Test that the frontend Real-Time Transparency Dashboard updates instantly without lag when this script is run. This proves the architecture to the judges.
- Ensure the UI looks premium (glassmorphism, clean fonts, dark mode).
> 📌 **Commit Reminder:** `git commit -m "chore: add telemetry simulation script and polish UI for live demo"`

---
**End of PRD Overview.** You may now begin with **Step 1**.
