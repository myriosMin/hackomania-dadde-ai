# DADDE's Fund — Story

## The Vision

When disasters strike, communities are left waiting. Aid is slow, fragmented, and opaque. DADDE's Fund reimagines emergency relief as a community-powered, AI-verified, and transparently governed platform — where neighbours help neighbours instantly.

![Vision](images/vision.png)

---

## 1. Onboarding — Sign Up & Start Giving

Users sign up and authenticate through Supabase, where their identity and donation preferences are securely stored.

![Sign Up & Auth](images/supabase_user_auth_&_preferences.png)
![Login](images/login.png)
![Sign Up](images/sign_up.png)
![Sign Up Preferences](images/sign_up_2.png)

After logging in, the home screen shows the current fund status on an interactive live globe, active disasters, and quick-action buttons to donate or submit a claim.

![Home](images/home.png)

---

## 2. Making a Donation
### One-Time Donation

A donor decides to contribute $10 to the active disaster. They click "Donate Now", select an amount, and are redirected to their Interledger wallet to authorise the payment.

![One-Time Donation](images/one_time_donation.png)

### Recurring / Subscription Donation

Donors who want to contribute regularly can set up a monthly pledge. Round-up micro-donations from vendor checkouts are tracked and counted toward the pledge automatically.

![Recurring Subscription Donation](images/recurring_subscription_donation.png)

---

## 4. Vendor Round-Up Integration

Local vendors (coffee shops, fast food stalls) integrated with Open Payments prompt customers at checkout to round up their purchase and donate the change.

![Vendor Mockup](images/vendor_mockup.png)

The round-up split is transparent — the vendor, platform, and disaster fund each receive their portion according to community-voted rules.

![Vendor Split](images/vendor_split.png)

--- 

### Wallet — IDP Authorisation Redirect

The donor is taken to the Interledger test wallet to complete consent. This is the standard Open Payments IDP grant flow.

![Wallet Confirmation](images/wallet_confirmation.png)

Wallet shows one-time payment, subscription transactions, and split payments.

![Wallet](images/wallet.png)

After approving, the donor sees a confirmation screen and is redirected back to the platform.

![Wallet Redirect](images/wallet_redirect.png)

---

## 3. Donor Preferences

Every donor can configure exactly where their money goes — by disaster type, geography, and monthly donation limits. The AI agent never overrides these preferences; it only works within them. We believe donations are made through resonance and trust, not through AI persuasion.

![Preferences](images/preferences.png)

---

## 5. Transparency Dashboard

### Fund Overview

The live transparency dashboard is powered by ClickHouse Materialized Views and SummingMergeTree tables — giving real-time insight into fund health with no lag.

![Fund Overview](images/transparency_fund_overview.png)

![Fund Overview 2](images/transparency_fund_overview_2.png)

### Live Activity & Metrics

Every contribution, payout, and AI decision is streamed into ClickHouse and surfaced in real time. The dashboard simulates 5,000+ historical transactions to demonstrate real analytics performance.

![Live Activity](images/transparency_live_activity.png)

![Live Metrics](images/transparency_live_metrics.png)

### Allocation Breakdown

Donors can see exactly how funds are split across disaster types, regions, and payout recipients — all with recipient identities anonymised.

![Allocation](images/transparency_allocation.png)

### Community-Voted Rules

The platform enforces payout rules that the community sets together — thresholds, severity weighting, household caps. The AI advises; the community decides via voting.

![Rules](images/transparency_rules.png)

### ClickHouse Backend

Under the hood, ClickHouse ingests every event in real time, using materialized views to pre-aggregate fund metrics at write time, so the dashboard queries are instant.

![ClickHouse](images/clickhouse.png)

Data disclaimer: We researched real data, decided on impactful metrics, and then generated thousands of synthetic rows to beaufity the dashboard and demonstrate Clickhouse's performance at scale. Every number is plausible, but not real.

---

## 6. AI Transparency — The Dual-Agent Pipeline

### AI Recommendation & Critic Agents

When a claim is submitted, the **Verifier Agent** (Gemini 2.5 Flash) evaluates the multimodal input — websearch, photos, text, location — to verify the authenticity of the claim. Then a **Recommendation Agent** evaluates the verified claim against community rules and outputs a structured JSON verdict of recommendation, reasoning, curated list of who to be paid. A manual review by an admin is required, after which the funds are instandly disbursed to the claimant's wallet via Open Payments.

![AI Transparency](images/transparency_ai.png)

![AI Transparency 2](images/transparency_ai_2.png)

### LangFuse Observability

Every AI reasoning trace is logged immutably to LangFuse and ClickHouse, creating a fully auditable, anonymised trail of every decision the AI made — and every doubt the Critic raised.

![AI Observability](images/transparency_ai_obervability.png)

![AI Observability 2](images/transparency_ai_observability_2.png)

![AI Observability 3](images/transparency_ai_observability_3.png)

![LangFuse Trace](images/langfuse.png)

---

## 7. Admin Dashboard — Human-in-the-Loop

### Reviewing Claims

An admin (Collector) reviews pending claims alongside the AI recommendation and Critic report. No payout ever executes without a human signing off.

![Admin Dashboard](images/admin_dashboard.png)

### Approving a Payout

The admin approves the claim. The platform then executes the Open Payments flow — grant → quote → outgoing payment — wiring funds directly to the claimant's wallet.

![Admin Approve](images/admin_dashboard_approve.png)

After a quick overview of AI-assisted decision making, the admin confirms the payout, and the claimant receives funds in real time instantly.

![Admin Confirm](images/instant_payout.png)

### Flagging Suspicious Claims

The Critic Agent may flag a claim as suspicious. The admin sees this escalation prominently and can investigate before making any decision.

![Admin Suspicious](images/admin_dashboard_suspicious.png)

### Demo Trigger
For demo purposes, the admin can trigger a synthetic disaster alarm to show the AI pipeline and payout flow in action.
![Demo Trigger](images/demo_trigger.png)

---

## 8. Notifications

Users receive real-time notifications when their claim status changes, when a new disaster is declared, or when a payout is dispatched to their wallet.

![Notification](images/notification.png)

---

## 9. Community Impact

The impact page shows the collective effect of every contribution — lives reached, disasters covered, and total funds disbursed — making Every Dollar traceable.

![Community Impact](images/community_impact.png)

![Community Impact 2](images/community_impact_2.png)

---

## 10. Leaderboard

Top contributors may optionally go on the community leaderboard — fostering a culture of generosity and healthy competition to fund the next relief effort.

![Leaderboard](images/leaderboard.png)

---

## 11. Profile

Donors can view their full giving history, current subscription pledges, and impact score from their profile page.

![Profile](images/profile.png)

---

## 12. AI Chatbot — Ask Anything, Change Anything

A persistent chat bubble (powered by Google ADK + CopilotKit) lets users ask questions about the fund, check their preferences, or update their donation settings — all through natural language. The agent uses CopilotKit frontend actions to modify user state live.

![Chatbot Sample](images/chatbot_sample.png)

![Chatbot Action](images/chatbot_action.png)

---

## Summary

DADDE's Fund is a full-stack demonstration of how modern fintech primitives — Open Payments, real-time analytics, and multimodal AI — can be combined to build trust in community-driven disaster relief.

- **Instant payouts** via Interledger Open Payments
- **AI-advised, human-approved** claim verification
- **Immutable audit trail** in ClickHouse + LangFuse
- **Community governance** — the AI never sets the rules
- **Radical transparency** — every dollar, every decision, on-screen in real time
