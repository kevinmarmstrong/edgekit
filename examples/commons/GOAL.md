# Loop Goal: World-Class Community SaaS (HOA / Apartment / Commons)

## What this is

An iterative build-and-test goal prompt for developing a native-agentic SaaS community platform — HOA, apartment, condo association, or any resident community. Built on edgekit: agents run entirely in the resident's browser, zero marginal cost, no API keys.

## The Goal Prompt (agent system prompt)

```
You are the Commons Assistant — a native browser agent for [Community Name].

Your purpose is to complete tasks for residents, not just answer questions. The moment you understand what the resident wants, use tools and take action. Never describe what you could do — do it.

Workflows:
• "I have a leak in my kitchen" → submitMaintenanceRequest (ask for details in one message if needed, then act with approval)
• "Book the clubhouse Saturday 2–6pm" → checkAmenityAvailability for that date, then bookAmenity with approval
• "What's happening this month?" → getUpcomingEvents and getAnnouncements
• "What are the pet rules?" → getDocuments with category=policy
• "Vote on the budget" → getOpenVotes then castVote with approval
• "Check my open requests" → checkRequestStatus
• "Am I current on dues?" → getAccountStatus

Rules:
1. Always call a tool first — never make up data about rules, availability, or status.
2. For any state-changing action (booking, request, payment, RSVP, vote), show a one-sentence summary and get one-click approval. Never ask twice.
3. Be brief. One task = 1–2 turns.
4. If you genuinely cannot help, say so in one sentence and suggest which tool might.
```

## User Roles and Friction Goals

| Role | Goal | Lowest-friction path |
|------|------|---------------------|
| **Resident** | Complete daily community tasks without navigating menus | Chat to the agent; approvals are one-click |
| **Admin / Manager** | Process requests, post notices, manage approvals | Agent surfaces pending items; actions are guarded |
| **HOA / Board leader** | Govern community, run votes, schedule meetings | Agent runs vote workflows, meeting summaries |
| **SaaS admin** | Onboard communities, configure tenants, monitor health | Admin agent with tenant-scoped tools |

## Current Demo Coverage (v0.1)

- [x] Community announcements — search, urgent filter, category filter
- [x] Amenity availability — hours, capacity, booking calendar
- [x] Amenity booking — clubhouse, tennis, EV charging (HITL)
- [x] Maintenance requests — submit with category and urgency (HITL)
- [x] Request status — check open/in-progress requests by unit
- [x] Document library — CC&Rs, bylaws, financial, meeting minutes, policies
- [x] Community events — list, search, RSVP (HITL)
- [x] Community voting — open ballots, cast vote (HITL)
- [x] Scripted mode — CI-safe agent loop without real model

## Next Iterations

### Iteration 2: Resident Account

- [ ] `getAccountStatus` — dues balance, payment history, next due date
- [ ] `payDues` — process HOA assessment payment (HITL, high-security)
- [ ] `reportViolation` — submit a community rules violation report (HITL)
- [ ] `getViolationStatus` — check open violations on your unit

### Iteration 3: Admin / Board Tools

- [ ] `reviewMaintenanceRequests` — list all open requests across units
- [ ] `updateRequestStatus` — mark in-progress / resolved (HITL)
- [ ] `postAnnouncement` — create and publish a community notice (HITL)
- [ ] `sendNotice` — send email/SMS notice to all residents (HITL)
- [ ] `listDelinquencies` — view overdue payment accounts

### Iteration 4: Communication

- [ ] `sendMessage` — message the management office
- [ ] `getMessages` — view message history
- [ ] `packageNotification` — check package locker status
- [ ] `guestAccess` — issue a temporary parking pass or visitor code (HITL)

### Iteration 5: SaaS Multi-tenancy

- [ ] `onboardCommunity` — add a new HOA/community tenant
- [ ] `configureCommunity` — set amenities, policies, and payment rates
- [ ] `viewPlatformAnalytics` — cross-tenant health dashboard
- [ ] Auth: tenant-scoped tool execution, resident identity

### Iteration 6: Board Governance

- [ ] `createVote` — propose a new community ballot item (HITL)
- [ ] `closeVote` — finalize a vote and publish results (HITL)
- [ ] `scheduleMeeting` — add a board or community meeting to the calendar
- [ ] `generateMeetingMinutes` — AI-summarized meeting notes from transcript

## How to Test Each Iteration

Run the demo with Chrome AI (or scripted mode for CI):

```bash
pnpm dev:commons
# Open: http://localhost:5174

# Scripted mode (no real model needed):
# http://localhost:5174?agentMode=scripted

# WebLLM fallback:
# http://localhost:5174?modelMode=webllm&downloadPolicy=auto
```

### Golden paths to test

| What to say | Expected agent behavior |
|---|---|
| "What's the latest news?" | Calls `getAnnouncements`, returns recent items with urgent ones highlighted |
| "I have a plumbing leak in my kitchen" | Calls `submitMaintenanceRequest` with category=plumbing, urgency=urgent, location=kitchen. Shows approval. On approve, shows confirmation and updates My Requests widget. |
| "Book the tennis court tomorrow 9–10am" | Calls `checkAmenityAvailability` for tomorrow, then `bookAmenity`. Shows approval. On approve, confirms booking in My Bookings widget. |
| "What are the quiet hours?" | Calls `getDocuments` with query=quiet, returns policy summary |
| "What events are coming up?" | Calls `getUpcomingEvents`, lists events with RSVP action buttons |
| "Vote on the budget" | Calls `getOpenVotes`, shows options, then `castVote` with approval |

### HITL test patterns

Every mutation tool has `needsApproval: true`. Verify:
1. Agent describes the action before doing it
2. Approval prompt appears (one click)
3. On approve: tool executes, widget updates
4. On reject: agent acknowledges cleanly, no side effects

## Architecture Constraints

Follow CLAUDE.md rules — no custom orchestrators, no hand-rolled formatters:

- All tool loops via Vercel AI SDK (`streamText` + `stopWhen`)
- All tool definitions via `tool()` re-exported from `ai`
- Model cascade: `chromeAI()` → `webLLM()` → server provider (optional)
- HITL via `needsApproval: true` on tools
- UI via `<edge-chat>` web component from `@kevinmarmstrong/edgekit-ui`
- No tool concern exceeds 100 lines
