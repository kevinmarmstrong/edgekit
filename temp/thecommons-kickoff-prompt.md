# TheCommons — Build Kickoff Prompt

Paste this into a fresh Claude Code session. Attach `user-stories.md` to the session before sending.

---

## Your Task

Build **TheCommons** — a world-class, segment-redefining SaaS HOA/community platform — from scratch in a new private GitHub repository. The attached `user-stories.md` is the complete product specification. Every user story in it is a deliverable.

Do not stop until CI is green and the app is deployed to Cloudflare and passing E2E tests. After each iteration, update `BUILDLOG.md` so any session or agent can pick up exactly where you left off.

---

## Step 1: Create the Repository (do this first)

Use the GitHub MCP tool to create a new **private** repository:
- Owner: `kevinmarmstrong`
- Name: `thecommons`
- Description: `Native-agentic SaaS for HOA, apartment, and community management`
- Private: `true`
- Auto-init with README: `true`

Then clone it locally and set it as your working directory for all subsequent work.

---

## Step 2: Bootstrap the Project

Initialize a **Vite + TypeScript + React** monorepo with `pnpm` workspaces:

```
thecommons/
  apps/
    web/          ← main PWA (Vite + React + TypeScript)
    worker/       ← Cloudflare Worker (API + D1 + KV)
  packages/
    ui/           ← shared React components
    tools/        ← edgekit tool definitions (one file per domain)
  BUILDLOG.md     ← updated after every iteration
  .github/
    workflows/
      ci.yml      ← typecheck + test + build + deploy-preview
```

Install these dependencies in `apps/web`:

```bash
pnpm add @kevinmarmstrong/edgekit @kevinmarmstrong/edgekit-ui @kevinmarmstrong/edgekit-skills ai zod react react-dom
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest @playwright/test wrangler
```

Install in `apps/worker`:

```bash
pnpm add hono zod
pnpm add -D wrangler typescript
```

---

## Step 3: Architecture Constraints (read before writing any code)

### AI Agent (edgekit)

- All AI runs **entirely in the browser** — no server-side LLM calls
- Model cascade: `chromeAI()` → `webLLM({ modelSize: 'about 400 MB' })` → Cloudflare AI fallback
- All tool loops via Vercel AI SDK `streamText` + `stopWhen: stepCountIs(8)`
- All tool definitions via `tool()` from `@kevinmarmstrong/edgekit` — never hand-roll
- Every mutation tool must have `needsApproval: true` (HITL)
- Agent UI via `<edge-chat>` web component from `@kevinmarmstrong/edgekit-ui`
- No tool concern exceeds 100 lines

### Backend (Cloudflare Worker)

- Runtime: **Cloudflare Workers** (Hono framework)
- Database: **Cloudflare D1** (SQLite) for all persistent data
- Cache/config: **Cloudflare KV** for tenant configuration and session tokens
- Auth: Workers validate session tokens; never trust client claims
- All API routes are the tools the agent calls — no direct DB access from browser
- Required headers on all responses: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` (required for SharedArrayBuffer / WebLLM)

### Auth

- Google OAuth 2.0 (one-click)
- Magic email link (Resend or Cloudflare Email Workers)
- Magic SMS code (6-digit OTP via Twilio or similar)
- All three methods on a single login screen
- Vendor/guest access via magic SMS link — no account required
- Sessions: 30-day rolling JWT stored in HttpOnly cookie
- HITL re-auth: financial and irreversible actions always require fresh auth

### PWA

- `manifest.json` with name, icons (512px), `display: standalone`, `start_url`
- Service Worker: cache shell + offline read-only mode
- Install prompt: show "Add to Home Screen" banner after first successful action
- Push notifications: Web Push API for announcements, maintenance updates, votes

### Permission System

- No hardcoded roles — every capability is a discrete, assignable permission with optional expiry
- Any user can hold any permission (a resident can be treasurer; a volunteer can be maintenance coordinator)
- All permissions are publicly visible on the community transparency dashboard
- Separation of powers: financial permissions, administrative permissions, and communication permissions are separate and cannot be bundled
- Permission changes require Board approval (HITL)

---

## Step 4: Build Iterations

Work through these iterations in order. After each one: run CI, deploy to Cloudflare preview, write E2E tests that pass, update BUILDLOG.md.

### Iteration 1 — Foundation

- [ ] Vite + React + TypeScript app scaffolded
- [ ] Cloudflare Worker scaffolded with Hono
- [ ] D1 schema: `users`, `units`, `sessions`, `communities`, `permissions`
- [ ] `wrangler.jsonc` with D1 binding, KV binding, COOP/COEP headers
- [ ] CI workflow: typecheck + build + `wrangler deploy --dry-run`
- [ ] BUILDLOG.md created with iteration status

### Iteration 2 — Auth

- [ ] Google OAuth callback route in Worker
- [ ] Magic email link flow (generate → verify → issue session)
- [ ] Magic SMS code flow (generate → verify → issue session)
- [ ] Login screen with all three methods on one page
- [ ] Session middleware (JWT in HttpOnly cookie)
- [ ] Logout / revoke all sessions
- [ ] Unit invite link = magic link that sets up account in one step
- [ ] E2E: login with each method, session persists on reload

### Iteration 3 — Resident Dashboard + Agent Shell

- [ ] Dashboard: announcements feed, my requests widget, my bookings widget, open votes counter
- [ ] `<edge-chat>` integrated with system prompt from `GOAL.md`
- [ ] Model cascade wired: chromeAI → webLLM → stub
- [ ] Scripted mode (`?agentMode=scripted`) for CI
- [ ] PWA manifest + service worker skeleton
- [ ] E2E: scripted agent loop end-to-end

### Iteration 4 — Announcements & Documents

Tools: `getAnnouncements`, `getDocuments`

- [ ] D1 tables: `announcements`, `documents`
- [ ] Worker routes: `POST /api/announcements/search`, `POST /api/documents/search`
- [ ] Seed data: 5 announcements (1 urgent), 8 documents across categories (CC&Rs, bylaws, financial, minutes, policies)
- [ ] Agent correctly filters urgent announcements and returns document summaries
- [ ] E2E: "What's the latest news?" → getAnnouncements; "What are the pet rules?" → getDocuments

### Iteration 5 — Maintenance Requests

Tools: `submitMaintenanceRequest` (HITL), `checkRequestStatus`

- [ ] D1 tables: `maintenance_requests`
- [ ] Worker routes: `POST /api/maintenance`, `GET /api/maintenance?unit=`
- [ ] Categories: plumbing, electrical, HVAC, appliance, structural, landscaping, other
- [ ] Urgency levels: routine, urgent, emergency
- [ ] Photo upload: Cloudflare R2 presigned URL
- [ ] My Requests widget updates live after submission
- [ ] E2E: submit request → approve → widget shows new request

### Iteration 6 — Amenities & Booking

Tools: `checkAmenityAvailability`, `bookAmenity` (HITL)

- [ ] D1 tables: `amenities`, `bookings`
- [ ] Worker routes: `POST /api/amenities/availability`, `POST /api/bookings`
- [ ] Amenities: clubhouse, pool, tennis court, gym, EV charging (6 stations), rooftop
- [ ] Conflict detection: cannot double-book same slot
- [ ] My Bookings widget updates live after booking
- [ ] E2E: check availability → book → conflict scenario

### Iteration 7 — Events & RSVP

Tools: `getUpcomingEvents`, `rsvpEvent` (HITL)

- [ ] D1 tables: `events`, `rsvps`
- [ ] Worker routes: `POST /api/events/search`, `POST /api/events/rsvp`
- [ ] registerActions() for one-click RSVP after event listing
- [ ] E2E: list events → RSVP → attendance count updates

### Iteration 8 — Community Voting

Tools: `getOpenVotes`, `castVote` (HITL)

- [ ] D1 tables: `votes`, `ballots`
- [ ] Worker routes: `POST /api/votes/list`, `POST /api/votes/cast`
- [ ] Anonymous tallying: vote cast shows "Thank you for voting" without revealing choices
- [ ] Open Votes counter widget
- [ ] E2E: list votes → cast → cannot vote twice

### Iteration 9 — Resident Account

Tools: `getAccountStatus`, `payDues` (HITL + re-auth), `reportViolation` (HITL), `getViolationStatus`

- [ ] D1 tables: `accounts`, `payments`, `violations`
- [ ] dues balance, payment history, next due date
- [ ] Payment: redirect to Stripe Checkout (or Cloudflare integration)
- [ ] HITL re-auth on payDues: require fresh magic code before payment
- [ ] Violation reporting: submit with photos, description, unit location
- [ ] E2E: check dues → pay flow → violation report

### Iteration 10 — Permission System + Transparency Dashboard

- [ ] D1 tables: `permission_assignments` (user, permission, granted_by, expires_at, scope)
- [ ] Permission types: ANNOUNCE, MAINTENANCE_MANAGE, BOOKING_ADMIN, FINANCE_READ, FINANCE_WRITE, VOTE_MANAGE, VENDOR_MANAGE, VIOLATIONS_MANAGE, GROUP_MANAGE, MEMBER_INVITE, MEMBER_REMOVE, CONFIG_COMMUNITY
- [ ] Worker routes: `GET /api/permissions/community` (public), `POST /api/permissions/assign` (Board only), `DELETE /api/permissions/revoke` (Board only)
- [ ] Transparency dashboard: public page showing every permission holder, their permissions, and expiry
- [ ] Permission changes require Board HITL approval
- [ ] E2E: assign permission → appears on transparency dashboard immediately

### Iteration 11 — The Bench (Vendor Recommendation Board)

Tools: `searchVendorRecommendations`, `submitVendorRecommendation` (HITL)

- [ ] D1 tables: `vendor_recommendations` (author_id required — no anonymous posts)
- [ ] Fields: vendor_name, trade, description_of_work, cost_range, contact_info, recommend (boolean), photos (R2 URLs), author_unit
- [ ] Search by trade, name, recommend status
- [ ] No anonymous posting: author identity always shown
- [ ] Photos: Cloudflare R2 upload
- [ ] E2E: search vendors → submit recommendation → appears in search

### Iteration 12 — Community Groups

Tools: `getCommunityGroups`, `joinGroup` (HITL), `postGroupMessage` (HITL)

- [ ] D1 tables: `groups`, `group_members`, `group_messages`
- [ ] Group creation/management requires GROUP_MANAGE permission (assignable)
- [ ] Group types: social, operational (design review, landscaping), interest (garden club, walking club, book club)
- [ ] Group message board: attributed posts only (no anonymous)
- [ ] E2E: create group (with permission) → join → post message

### Iteration 13 — Admin Tools

Tools: `reviewMaintenanceRequests`, `updateRequestStatus` (HITL), `postAnnouncement` (HITL), `listDelinquencies`

- [ ] Admin view: all open requests across units
- [ ] Status updates: new → in-progress → scheduled → resolved
- [ ] Post announcement: requires ANNOUNCE permission
- [ ] Delinquency list: requires FINANCE_READ permission
- [ ] E2E: update request status → resident My Requests widget reflects update

### Iteration 14 — Guest Access

Tools: `issueGuestAccess` (HITL), `checkGuestAccess`

- [ ] Temporary parking pass: QR code valid for N days, issued via SMS
- [ ] Visitor code: one-time entry code
- [ ] Guest link: magic SMS link, no account required
- [ ] E2E: issue guest access → QR displayed → expiry enforced

### Iteration 15 — Multi-tenancy (SaaS)

- [ ] D1: all tables have `community_id` column; all queries scoped to tenant
- [ ] SA (SaaS Admin) dashboard: onboard community, configure amenities/rules, view platform analytics
- [ ] Community subdomain routing: `oakridge.thecommons.app`
- [ ] KV: tenant config (amenity list, payment provider keys, branding)
- [ ] E2E: create second community → verify data isolation

---

## Step 5: Cloudflare Deployment (every iteration)

Use the `/cloudflare` skill for all deployments. After each iteration:

1. `wrangler deploy` to a preview environment named `thecommons-preview`
2. Run Playwright E2E tests against the preview URL (not localhost)
3. Record preview URL in BUILDLOG.md
4. Only mark iteration complete when E2E tests pass against the Cloudflare preview

Cloudflare resources to provision:
- D1 database: `thecommons-db`
- KV namespace: `thecommons-config`
- R2 bucket: `thecommons-media`
- Worker: `thecommons-api`
- Pages project: `thecommons-web` (for the PWA)

---

## Step 6: CI (must stay green throughout)

`.github/workflows/ci.yml` must run on every push and PR:

```yaml
jobs:
  ci:
    steps:
      - typecheck (pnpm -r typecheck)
      - unit tests (vitest run)
      - build (pnpm -r build)
      - wrangler dry-run (wrangler deploy --dry-run)
      - E2E tests against Cloudflare preview (playwright test)
```

CI must be green before any iteration is marked complete.

---

## Step 7: BUILDLOG.md Format

Update this file after every iteration. Format:

```markdown
# TheCommons — Build Log

## Status: [Iteration N — Description]
Last updated: [ISO timestamp]
Preview URL: https://thecommons-preview.[account].workers.dev
CI: [green / red — link to run]

## Completed Iterations
- [x] Iteration 1 — Foundation
- [x] Iteration 2 — Auth
...

## Current Iteration
- [ ] Task 1
- [x] Task 2
...

## Next Up
[What the next session should work on]

## Known Issues
[Any blockers or known bugs]

## GitHub Issues
[Links to open issues]
```

---

## Design Constraints (non-negotiable)

1. **No anonymous posting ever** — every user-generated piece of content has an attributed author shown publicly
2. **Lowest friction auth** — Google, magic email, magic SMS on one screen; invite link = one-step account creation
3. **Transparency first** — all permission holders and their scopes are public; residents can always see who has what authority
4. **HITL for every mutation** — show a one-sentence summary, get one-click approval, then act
5. **PWA** — installable to home screen, offline read-only, push notifications
6. **edgekit** — all AI runs in the browser; `@kevinmarmstrong/edgekit` is an npm dependency, not built from source
7. **Separation of powers** — financial, administrative, and communication permissions are separate and cannot be bundled into one assignment

---

## Start Now

Your very first action: create the private GitHub repository `kevinmarmstrong/thecommons` using the GitHub MCP tool. Then scaffold the monorepo, push the initial commit, and create a `BUILDLOG.md` marking Iteration 1 as in-progress. From there, work through the iterations in order.

Do not stop between iterations to ask for confirmation — keep building, keep CI green, keep BUILDLOG.md current.
