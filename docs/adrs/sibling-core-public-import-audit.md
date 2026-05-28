Audience: contributor

# ADR: Sibling Packages Use Core Public Imports Only

Status: accepted for v3.5 Phase B

Sibling packages may import from `@kevinmarmstrong/edgekit` only through the package root and only for KEEP-CORE harness contracts. They must not deep-import from core internals.

Current Phase B audit:

| Package | Core imports | Verdict |
|---|---|---|
| `@kevinmarmstrong/edgekit-skills` | `CreateAgentOptions` | KEEP-CORE |
| `@kevinmarmstrong/edgekit-knowledge` | `modelOptional`, `tool`, `EdgeSessionContext`, `EdgeToolExecutionContext` | KEEP-CORE |
| `@kevinmarmstrong/edgekit-governance` | `EdgeActivityEvent`, `EdgeToolExecutionContext` | KEEP-CORE |
| `@kevinmarmstrong/edgekit-mcp` | `tool`, `EdgeToolExecutionContext` | KEEP-CORE |
| `@kevinmarmstrong/edgekit-agui` | `AgentEvent`, `EdgeAgent`, `EdgeSessionContext`, `EdgeTelemetryEvent`, `EdgeTelemetrySink` | KEEP-CORE |

AG-UI and Knowledge previously touched core detail types that Phase A classified as DEFER or sibling-owned. Those were replaced with derived types from KEEP-CORE contracts or local sibling-owned shapes before Phase C.

Audit command:

```bash
rg -n "from '@kevinmarmstrong/edgekit'|@kevinmarmstrong/edgekit/" packages/{skills,knowledge,governance,mcp,agui}/src/index.ts
```
