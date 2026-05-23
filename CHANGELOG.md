# Changelog

## 2.0.0 (2026-05-23)

### Breaking Changes

- `createRuntime` now returns a v2 graph-backed runtime. The v1 linear orchestrator is available as `createRuntimeV1`.
- New `AgentState` type replaces internal state management. State is fully immutable.
- Event types expanded: AG-UI protocol events alongside legacy `RuntimeEvent` types.

### Features

- **Graph Orchestrator**: 8-node directed graph (input_guardrail, route, retrieve, think, act, hitl, respond, escalate) with conditional edges and ReAct tool-calling loop.
- **`defineAgent()` API**: Declarative agent builder. Define custom agents with name, description, model, RAG, tools, custom nodes, and custom edges.
- **HITL Checkpoints**: Human-in-the-loop approval with Promise-based suspension, configurable timeout, and abort signal support.
- **Skill Routing**: Keyword-based query routing with confidence scoring, configurable thresholds, and default skill fallback.
- **Cloud Escalation**: Automatic escalation to cloud inference when local model confidence is below threshold.
- **AG-UI Event Protocol**: 12 AG-UI standard events + 8 edgekit extension events for structured agent-UI communication.
- **`docsAgent()`**: Pre-built documentation Q&A agent in `@edgekit/skills`.
- **Backward Compatibility**: v1 `createRuntime` API works identically, backed by v2 graph engine.

### Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@edgekit/core` | 2.0.0 | Graph orchestrator, defineAgent, event bus, guardrails |
| `@edgekit/model-webllm` | 2.0.0 | WebLLM adapter (WebGPU inference) |
| `@edgekit/model-chrome` | 2.0.0 | Chrome Prompt API adapter (Gemini Nano) |
| `@edgekit/rag-local` | 2.0.0 | IndexedDB vector store with cosine similarity |
| `@edgekit/embeddings` | 2.0.0 | Transformers.js embedding adapter |
| `@edgekit/skills` | 2.0.0 | Built-in skills (blog-chat, docs-agent) |
| `@edgekit/ui-component` | 2.0.0 | Lit web component `<edge-chat>` |
| `@edgekit/cli` | 2.0.0 | Content ingestion CLI |

### Test Coverage

- 248 tests across 23 test files
- 20 defineAgent tests
- 19 backward compatibility tests
- 16 route node tests
- 16 HITL node tests
- 17 escalate node tests
- 13 docs-agent tests

## 0.1.0 (2026-05-22)

Initial release with linear orchestrator, WebLLM + Chrome AI providers, RAG pipeline, web component UI, skills framework, and CLI.
