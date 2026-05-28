Audience: contributor

# ADR: v3.5 Deprecation Convention

Status: accepted for v3.5 Phase C

Phase B extracted sibling packages without removing core exports. Phase C turns that compatibility bridge into explicit deprecation surface.

For every KEEP-SIBLING export that remains available from `@kevinmarmstrong/edgekit`, the compatibility export must carry JSDoc:

```ts
/** @deprecated Use @kevinmarmstrong/edgekit-{sibling} instead. */
```

The replacement package must be named in the message, for example `@kevinmarmstrong/edgekit-skills`, `@kevinmarmstrong/edgekit-knowledge`, `@kevinmarmstrong/edgekit-governance`, `@kevinmarmstrong/edgekit-mcp`, or `@kevinmarmstrong/edgekit-agui`.

DEFER exports are not part of the v0.3 public API contract. Phase C should remove them from the root surface when no compatibility bridge is needed. Any temporary survivor must receive a stronger deprecation note explaining why it remains and when it is removed.

Removal commitment: compatibility shims are tracked for removal in v0.4 or the next planned breaking release, whichever comes first. The changelog must list each compatibility group before release so adopters see the migration path in package docs and IDEs.

Important packaging constraint: a compatibility re-export from the core package to a sibling can create a package cycle because siblings already depend on core harness types. Phase C must either keep deprecated wrappers source-local until Phase D deletes the old implementation, or introduce an aggregator package boundary before using runtime re-exports. Do not add a core package dependency on a sibling without explicitly resolving that cycle.

Compatibility implementation files under `packages/core/src/compat/` are frozen after Phase C. They exist only to preserve old root imports during the v0.3 compatibility window. Bug fixes may be ported when necessary, but new behavior belongs in the sibling package first. Drift tests should compare representative root compatibility behavior with sibling-package behavior until the compatibility layer is deleted.

Phase D enforcement: `packages/core/test/compat-drift.test.ts` compares representative root compatibility exports with sibling implementations, and `pnpm test` runs that drift test plus the permanent core banned-pattern check. The GitHub Pages workflow runs `pnpm test` before typecheck/build so compatibility drift and AI SDK overlap regressions fail CI.
