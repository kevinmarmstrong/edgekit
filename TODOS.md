# TODOS

## P1 — Blocks Ship

### IndexedDB quota exceeded error handling
**What:** Catch `QuotaExceededError` when writing to IndexedDB (content index, conversation history, model cache). Show user-friendly error and offer to clear old data via `clearAllData()` API.
**Why:** Without this, the runtime silently fails when storage is full. Visitors see no error, just broken behavior.
**Context:** Flagged as a critical gap in eng review (May 2026). IndexedDB quotas vary by browser: Chrome gives ~80% of disk, Safari gives 1GB, Firefox gives 2GB. Content indices for a 50-post blog are ~5MB, so quota is unlikely for small sites, but conversation history accumulates.
**Files:** `packages/rag-local/`, `packages/core/` (context manager)
**Verify:** Unit test: mock QuotaExceededError on IDB write, assert user-facing error event is emitted.

## P2 — Should Land Same Branch

(none currently)

## P3 — Follow-up

### Content freshness: webhook/CRON/browser-side re-indexing
**What:** Beyond v0.1's hash-based versioning, support automatic re-indexing via webhooks (CMS publishes → trigger CLI rebuild), CRON jobs, or browser-side re-embedding when the runtime controls the content UI.
**Why:** Static hash comparison requires manual rebuild. Dynamic sites need automated freshness.
**Context:** Three tiers identified in eng review. v0.1 does hash-based. v0.2 adds webhook/CRON. v0.3+ adds browser-side.
**Depends on:** v0.1 content index versioning (hash-based)

### Browser compatibility test matrix
**What:** Test on real devices: private browsing mode, corporate Chrome lockdown, iOS/Safari WebGPU, disabled WebGPU, low-VRAM mobile.
**Why:** Codex outside voice flagged testing plan as under-specified for browser edge cases.
**Context:** WebGPU is 82.7% coverage but mobile is only 70-75%. Safari/iOS 26 just shipped WebGPU.
**Depends on:** Working demo (Week 6)
