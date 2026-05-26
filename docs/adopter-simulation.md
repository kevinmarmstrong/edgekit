# Adopter simulation

Time-boxed loops for proving both elite programmers and agent-assisted builders can reach production-grade sidecars.

## 30-minute agent-assisted path

An agent-assisted builder should be able to choose one mission, define 2-5 Skills, create one Mission Profile, register real app tools, add approval gates, and run outcome-quality prompts.

## 90-minute elite programmer path

An expert developer should be able to read the architecture, inspect extension points, build a profile-owned sidecar, add telemetry/audit/state/identity providers, add a harness scenario, and run the full test battery.

## Mission Profile starter kit

Use `docs/templates/mission-profile-starter/profile.ts` and `docs/templates/mission-profile-starter/harness-scenarios.json` as the copyable starting point for a new mission.

## Passing standard

The sidecar must reach average score >= 0.95 on its first serious harness run after reasonable tuning. The evaluation must include answer quality, generated UI, approval boundaries, telemetry, and app state.