# Clean-Room Adoption Proof

This lane proves the starter adoption path works outside the monorepo shape.
It creates a fresh local app, installs packed Edgekit tarballs, scaffolds a
mission with the packaged `edgekit-init` binary, validates the generated Mission
Profile, and builds the app.

```bash
pnpm proof:clean-room-adoption
```

Reports are written to:

```text
research-results/adopter-simulations/<run-id>/clean-room-adoption.md
research-results/adopter-simulations/<run-id>/clean-room-adoption.json
research-results/adopter-simulations/latest.md
research-results/adopter-simulations/latest.json
```

## What It Proves

- Edgekit packages can be built, packed, and installed from tarballs.
- The clean-room app uses `file:` tarballs, not `workspace:` aliases.
- The packaged `edgekit-init` starter can scaffold a support workflow mission.
- `validateMissionProfile(profile, { registeredTools })` succeeds for the
  scaffolded Mission Profile and registered tools.
- Starter scenarios include deterministic checks for read facts, approval-gated
  mutation, and no workspace dependency aliases.
- The generated app typechecks and builds.

## Provider Honesty

The default lane is:

```text
deterministic-local-clean-room-structural/no-model
```

That means no Chrome AI, WebLLM, cloud model, or live Pages deployment is used.
The report must be treated as a structural clean-room proof, not as
outcome-quality evidence. World-class adoption claims still require a
first-serious-run or production-shaped harness result with real prompts,
transcripts, screenshots, provider evidence, and required failures at zero.

## Current Release-Candidate Evidence

Latest verified run:

- Generated: `2026-05-27T18:06:27.913Z`
- Evidence level: `first-serious-run`
- Proof level: `clean-room-packed-artifacts`
- Provider lane: `deterministic local clean-room structural and outcome proof`
- Outcome score: `1.0`
- Required failures: `0`
- Time to passing outcome score: `10.2s`

The run created a fresh app outside the monorepo, installed packed Edgekit
tarballs, ran the public `edgekit-init` support workflow recipe, created a new
facilities-maintenance Mission Profile, validated it, built the app, and scored
read, approve, reject/no-mutation, telemetry/audit, and final-fact checks.

## Rerun Notes

Set these optional environment variables to change the scaffolded recipe or
output path inside the generated app:

```bash
EDGEKIT_CLEAN_ROOM_RECIPE=support-workflow \
EDGEKIT_CLEAN_ROOM_OUT=edgekit/support \
pnpm proof:clean-room-adoption
```

The lane intentionally uses public docs, package APIs, and starter artifacts.
If it needs hidden maintainer context or workspace path aliases to pass, the
proof should fail rather than paper over the adoption gap.
