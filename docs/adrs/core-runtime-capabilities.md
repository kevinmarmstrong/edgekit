Audience: contributor

# Core Runtime Capability ADR Notes

These one-line ADR notes apply the v3.5 friction-absorption test to every KEEP-CORE export in `packages/core/src/index.ts`.

| Export | ADR note |
|---|---|
| `LanguageModelV3` | Absorbs provider typing friction for custom AI SDK-compatible model routes without forcing adopters to import an extra provider type directly. |
| `modelOptional` | Absorbs small local-model schema brittleness around optional/nullish fields so adopters do not loosen schemas unsafely across every tool. |
| `stepCountIs` | Absorbs AI SDK loop-control import friction for the common bounded tool-loop path without wrapping or replacing AI SDK orchestration. |
| `tool` | Absorbs tool-shape compatibility friction by re-exporting the AI SDK primitive adopters already need, avoiding an Edgekit-specific tool format. |
| `DownloadPolicy` | Absorbs the product decision of whether model downloads are automatic, prompted, or forbidden so every integration does not invent its own consent switch. |
| `DownloadPromptEvent` | Absorbs model-download consent payload friction so host apps can use custom modals without reverse-engineering provider IDs, model sizes, or copy. |
| `ModelProvider` | Absorbs custom-provider adapter friction by defining the one wrapper shape required to participate in the local-first cascade. |
| `ModelStatusEvent` | Absorbs provider-readiness event shape friction so host UIs and telemetry receive one status contract across Chrome AI, WebLLM, server, and no-model states. |
| `NoModelEvent` | Absorbs graceful-degradation payload friction so apps can explain basic/no-model mode without surfacing WebGPU or browser API failures. |
| `ResolveModelContext` | Absorbs provider-resolution context friction so custom providers receive bounded input, status emission, timeout, and session state consistently. |
| `createModelProvider` | Absorbs provider-normalization friction so adopters can plug AI SDK-compatible models into the same cascade contract instead of special-casing every runtime. |
| `resolveModel` | Absorbs cascade fallthrough friction so each app does not reimplement local-first routing, status callbacks, and no-model behavior. |
| `CascadeReadinessOptions` | Absorbs readiness-controller configuration friction so apps can declare providers, required capabilities, fallback policy, and UI callbacks in one object. |
| `CascadeReadinessSnapshot` | Absorbs browser-model readiness-state friction by giving UIs a single snapshot for provider states, capabilities, missing requirements, and allowed actions. |
| `CascadeRecommendedAction` | Absorbs end-user next-action copy/control friction so UIs can show prompt, fallback, retry, or hide decisions from the readiness controller. |
| `EdgeCascadeReadinessController` | Absorbs ongoing readiness orchestration friction by exposing check, subscribe, prompt, fallback, hide, and retry controls as a stable controller. |
| `createCascadeReadinessController` | Absorbs end-user readiness/download-state friction so apps can show the right action for Chrome AI, WebLLM, server, or no-model states. |
| `AgentEvent` | Absorbs agent-to-UI streaming friction by exposing one event union for status, text, tool calls/results, approvals, activity, views, errors, and done. |
| `CreateAgentOptions` | Absorbs integration-wiring friction by collecting model cascade, tools, providers, policy, context, telemetry, and callbacks into one entry-point contract. |
| `EdgeAgent` | Absorbs UI/runtime boundary friction by exposing send, approval-resume, and reset as the small agent contract web components and wrappers consume. |
| `EdgeToolRepairOptions` | Absorbs bounded tool-repair configuration friction so validation retries stay explicit and limited instead of becoming hidden self-repair loops. |
| `createAgent` | Absorbs the wiring friction of provider cascade, tools, approvals, telemetry, history, and context so adopters do not rebuild an unsafe mini-orchestrator for every app. |
| `chromeAI` | Absorbs Chrome AI availability and gesture-state friction so adopters do not expose raw browser API failures or skip the zero-marginal-cost path. |
| `WebLLMOptions` | Absorbs WebLLM provider selection friction by making model ID and label configurable without exposing the underlying runtime setup. |
| `webLLM` | Absorbs WebGPU/WebLLM provider setup friction so adopters can offer a browser fallback without learning model registry and worker details first. |
| `EdgeActivityEvent` | Absorbs progress-state UI friction by exposing safe orchestration activity without leaking hidden reasoning or chain-of-thought. |
| `EdgeTelemetryEvent` | Absorbs observability payload friction by giving adopters one typed event shape for runs, model choice, tools, approvals, errors, and UI actions. |
| `EdgeTelemetrySink` | Absorbs monitoring-integration friction by letting adopters route Edgekit events to PostHog, OpenTelemetry, Datadog, or custom stores through one contract. |
| `EdgeIdentityProvider` | Absorbs public-identity bridging friction for apps that expose roles or permissions separately from a full session provider. |
| `EdgeSessionContext` | Absorbs the host-authority boundary by grouping public identity, auth transport, and state summary into one tool-execution context object. |
| `EdgeSessionProvider` | Absorbs async session hydration friction so adopters can bridge their existing auth/session layer into Edgekit without putting secrets in prompts. |
| `EdgeStateProvider` | Absorbs page/workflow-state hydration friction so tools receive concise app state without raw DOM dumps or model-owned authority. |
| `EdgeToolExecutionContext` | Absorbs governed tool-execution friction by carrying session, identity, auth, state, and cancellation metadata to host-owned tools. |
| `EdgeToolManifest` | Absorbs dynamic tool exposure metadata friction so apps can describe tool permissions and safety without making every tool executable upfront. |
| `EdgeToolProvider` | Absorbs dynamic tool exposure friction so apps can hydrate read and mutation tools only when intent, role, and workflow state justify them. |
| `EdgeToolProviderContext` | Absorbs phase-aware tool selection friction so dynamic tool providers can narrow tools by prompt, session, and run phase. |
| `resolveSessionContext` | Absorbs identity/state/session bridging friction so host apps pass public context into tool execution without leaking secrets into prompts. |
| `toolsFromManifests` | Absorbs manifest-to-tool hydration friction for dynamic tool exposure while keeping executable tool registration explicit. |

## Zero-Callsite KEEP-CORE Notes

None.
