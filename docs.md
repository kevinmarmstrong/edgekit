# Local-first agent sidecars

edgekit adds agent workflows to existing web apps without forcing every prompt, tool call, and UI step through a metered cloud agent.

## First principles

Developers usually investigate edgekit because they already want an agent in a site or application and have run into a blocker: unpredictable token costs, sensitive context, slow orchestration, offline workflows, tool safety, or the need to reuse existing product APIs.

edgekit starts from those constraints. Run browser-native models first, tune the cascade to the workflow, register existing app capabilities as typed tools, and let the host app remain the authority for data, permissions, state, and final execution.

- Unbounded token spend: run local browser models first and reserve cloud models for explicit fallback routes.
- Sensitive app context: keep prompts, state summaries, memory, and tool results local unless the app chooses otherwise.
- Existing app logic: register current APIs and functions as typed tools instead of rebuilding workflow logic.
- Model fit: choose Chrome AI, WebLLM, local model ladders, supervisor routing, or cloud workers per use case.
- Agent latency: combine parallel-safe read tools, edge response caching, and streaming activity states.
- Offline workflows: pair local inference with Markdown memory, offline mutation journals, and CRDT-ready sync adapters.
- Trust and compliance: require approvals for risky tools and emit telemetry plus hash-chained audit trails.
- Dynamic tools: hydrate RBAC-filtered manifests, adapt MCP catalogs safely, and wrap tool execution with policy limits.
- Agent-readable docs: provide Markdown and llms exports so coding agents can implement against the project without scraping UI chrome.

## Purpose

edgekit is not a chatbot wrapper. It is a small runtime and UI layer for adding an agent to an app that already has real capabilities: product search, cart changes, account updates, documentation search, support triage, or other app-specific workflows.

The developer registers existing functions as tools. The model can ask to call those tools, and edgekit streams the result into a sidecar UI while preserving approval gates for higher-impact actions.

## Repository map

The open source repo is organized as a small monorepo.

- `packages/core`: model cascade, provider helpers, agent event stream, approval resume.
- `packages/ui`: Lit web component, approval prompts, download prompts, chat shell.
- `packages/cli`: documentation indexing utility for project Q&A tools.
- `examples/ecommerce`: standalone app retrofit demo.
- `site`: GitHub Pages docs, Q&A, ecommerce demo, and SaaS admin demo.
- `tests/e2e`: Playwright coverage for embedded agent workflows.

## Mental model

Think of edgekit as an app sidecar. Your app keeps ownership of state, authorization, API boundaries, and UI context. edgekit owns the agent conversation, provider selection, tool-call events, approval prompts, and graceful fallback when local AI is unavailable.