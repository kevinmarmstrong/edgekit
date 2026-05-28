Audience: adopter

# Upgrade Notes

Use this file as the release-upgrade template for apps and demos that consume Edgekit packages.

## Template

For each release, record:

- **From / to**: package versions and commit SHAs.
- **Who is affected**: direct package consumers, root compatibility imports, AG-UI users, approval UI implementers, demo repos.
- **Required package changes**: install, remove, or rename package dependencies.
- **Import changes**: old import, new import, and whether the old path remains temporarily deprecated.
- **Runtime behavior changes**: anything that can fail at runtime even if TypeScript passes.
- **Verification**: `pnpm test`, `pnpm typecheck`, build, packed-package smoke, and one browser workflow.
- **Rollback**: last known compatible version and data/state safety notes.

## Worked Example: v0.2.x To v0.3.x Refactor Candidate

The v0.3 line splits optional runtime cohorts into sibling packages while keeping the root harness small.

### Package Changes

Install the sibling packages you use directly:

```bash
pnpm add @kevinmarmstrong/edgekit @kevinmarmstrong/edgekit-ui
pnpm add @kevinmarmstrong/edgekit-skills @kevinmarmstrong/edgekit-knowledge
pnpm add @kevinmarmstrong/edgekit-governance @kevinmarmstrong/edgekit-agui @kevinmarmstrong/edgekit-mcp
```

### Import Changes

Root compatibility exports remain temporarily, but new code should import from the owning sibling:

```ts
import { createSkill, createMissionProfile } from '@kevinmarmstrong/edgekit-skills'
import { createKnowledgeTool } from '@kevinmarmstrong/edgekit-knowledge'
import { createAuditTrail } from '@kevinmarmstrong/edgekit-governance'
import { createAgUiAgent } from '@kevinmarmstrong/edgekit-agui'
```

Keep core imports for the harness runtime:

```ts
import { chromeAI, createAgent, tool, webLLM } from '@kevinmarmstrong/edgekit'
```

### Runtime Behavior Changes

- `createAgUiAgent({ endpoint })` from the root package no longer carries the old root SSE transport. Import endpoint-based AG-UI agents from `@kevinmarmstrong/edgekit-agui`.
- Approval responses now carry the original `toolCall`; custom approval UIs should treat that field as the source of truth when resuming a mutation.
- Deprecated root compatibility exports are scheduled for removal in v0.4.

### Verification

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:workflows
pnpm research:quality
```

For release evidence, also run the provider lanes that match your claim and keep `research-results/provider-matrix.md`.
