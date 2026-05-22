# Contributing to edgekit

Thanks for your interest in contributing. Here's how to get started.

## Setup

```bash
git clone https://github.com/anthropics/edgekit.git
cd edgekit
pnpm install
pnpm build
pnpm test
```

Requires Node 22+ and pnpm 10+.

## Development

```bash
pnpm typecheck    # TypeScript project references
pnpm test         # Vitest across all packages
pnpm lint         # ESLint
pnpm build        # Build all packages

# Run the demo
cd examples/blog-chat
pnpm dev
```

## Project Structure

```
packages/
  core/           # Orchestrator, types, event bus, guardrails
  model-webllm/   # WebLLM (WebGPU) model provider
  model-chrome/   # Chrome Prompt API (Gemini Nano) provider
  rag-local/      # IndexedDB vector store + cosine similarity
  embeddings/     # Transformers.js embedding adapter
  ui-component/   # <edge-chat> Lit web component
  skills/         # Built-in skills (blog-chat)
  cli/            # Content ingestion CLI
examples/
  blog-chat/      # "Ask Kevin" demo
```

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add or update tests as needed
4. Run `pnpm typecheck && pnpm test && pnpm lint` to verify
5. Open a pull request

## Pull Requests

- Keep PRs focused on a single change
- Include a clear description of what changed and why
- Make sure CI passes (typecheck, lint, test, build)
- Link related issues if applicable

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Browser and OS version
- Minimal reproduction steps

## Code Style

- TypeScript strict mode
- Immutable patterns (no mutation)
- Small files (<400 lines)
- No `console.log` in library code
- Prefer `readonly` arrays and properties

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
