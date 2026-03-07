How the Admin Dashboard Fits the System
The overall workflow looks like this:
Disaster detected by AI or submitted by users


Admin dashboard receives the event


AI proposes recipients and payouts


Critic AI reviews recommendation


Admin approves or modifies payout


Funds are disbursed through Open Payments



If we simplify for hackathon MVP
You only really need 5 admin modules:
Overview Dashboard


Disaster Monitoring


AI Recommendation Review


Payout Approval


Community Fund Tracking


Everything else can be secondary.

If you'd like, I can also show you the single most impressive feature you could add to the Admin Dashboard that would make judges immediately understand the power of your system.
It shld be Top is key metrics such as fund balance active verified disasters pending approvals no. (either for fund transfer or for new outreach to be verified) Middle section A inbox for the pending approvals Bottom sections Live donation & trnasaction thats all. Thats the admin panel
That’s a good MVP scope for a hackathon. It’s simple, clear, and shows the operational flow without overengineering. Let me restate it in a clean functional spec so you can use it when designing in Figma.

Admin Dashboard (Hackathon MVP)
The admin dashboard is the control center for platform admins (Collectors). It allows them to monitor the community fund, review pending actions, and observe live activity.
The layout is divided into three main sections.

1. Top Section — Key Metrics
This section provides a quick system overview so admins immediately know the state of the platform.
Metrics displayed
Community Fund Balance
Shows the current total available funds.
Example:
Fund Balance
 $540,000
This represents the total money available for disaster payouts.

Active Verified Disasters
Shows the number of disaster events currently approved and visible on the donation platform.
Example:
Active Disasters
 7
These are disasters that:
passed verification


are currently receiving donations



Pending Approvals
Shows the number of items waiting for admin review.
This includes two types:
Payout approvals


New disaster submissions (outreach verification)


Example:
Pending Approvals
 5
This tells admins how many tasks require action.

2. Middle Section — Admin Inbox (Pending Approvals)
This is the most important section of the dashboard.
It acts as a task inbox where admins review items requiring decisions.
Each item in the inbox can be one of two types.

Type 1 — Payout Approval Request
Generated when the AI system proposes a payout.
Each request card shows:
Event Name
 Suggested payout amount
 Proposed recipients
 AI reasoning summary
Example:
Philippines Flood Relief
Suggested payout: $40,000
 Recipients: 3 verified organizations
 Reason: Severe flooding affecting 80,000 residents
Actions:
Approve
 Modify
 Reject

Type 2 — Disaster Verification Request
Generated when someone submits a disaster through the Reach Out page.
The AI agent has already attempted verification.
Each request card shows:
Disaster name
 Location
 Submission summary
 AI verification score
 Sources detected
Example:
Flooding in Jakarta
Reported by: Local NGO
 AI confidence: 85%
 Sources found: 4 news articles
Actions:
Approve Event
 Reject
 Request More Info

Inbox Behavior
Requests should be sorted by urgency or time.
Newest first or highest severity first.
Once approved:
disaster becomes visible on the donation website


payouts are triggered



3. Bottom Section — Live Donation & Transaction Feed
This section shows real-time activity across the platform.
It helps admins monitor engagement and financial flow.

What appears in the feed
Direct donations
Example:
$10 donation — Philippines Flood Relief

Round-up donations from vendors
Example:
$0.35 round-up — Kopi Corner purchase

Subscription charges
Example:
$15 monthly pledge — User #4921

Payout transactions
Example:
$20,000 transferred — Local Flood Relief NGO

Purpose
This section provides:
Transparency
 System monitoring
 Real-time platform activity
Admins can quickly detect unusual patterns.

Final Layout Summary
Admin dashboard has three stacked layers.
Top — Metrics
Fund Balance
 Active Disasters
 Pending Approvals

Middle — Approval Inbox
List of items needing decisions
Includes:
Payout requests
 Disaster verification requests

Bottom — Live Activity Feed
Real-time stream of:
Donations
 Round-ups
 Subscriptions
 Payout transactions

Why This Design Works
For a hackathon this is very strong because:
It shows human-in-the-loop governance


It clearly demonstrates AI recommendations + admin control


It visually represents money movement


It is simple enough to prototype


Judges will immediately understand the system.

