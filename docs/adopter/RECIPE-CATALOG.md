Audience: adopter

# Recipe Catalog

Recipes are opinionated paths for common app patterns. They keep onboarding fast without cluttering the core docs or changing Edgekit into a framework-specific product.

Each recipe should include:

- Mission statement.
- Required Skills.
- One Mission Profile.
- App-owned tool placeholders.
- Approval policy.
- Knowledge Access pattern when needed.
- Mounting code for the target app or framework.
- Outcome scenarios.
- Notes on what the real app must replace.

## Available Recipes

| Recipe | Command | Use When |
| --- | --- | --- |
| Support workflow | `edgekit-init mission --recipe support-workflow --out edgekit/support` | Internal or SaaS support surfaces with case search and ticket creation |
| Knowledge Skill | `edgekit-init mission --recipe knowledge-skill --out edgekit/policy` | Apps that need cited policy/docs/manual retrieval |
| Astro intake and knowledge | `edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake` | Astro sites that need a sidecar for site Q&A plus approval-gated intake |

## Astro Intake And Knowledge

This recipe is intentionally opinionated:

- Use an Astro component to mount `<edge-chat>`.
- Use a Knowledge Access Skill for site/CMS/KB retrieval.
- Use an approval-gated intake tool for lead, support, or contact submission.
- Keep API keys, cookies, email delivery, CRM writes, and notification logic in Astro server routes or backend services.
- Add outcome scenarios for cited answers, no-evidence answers, approved intake, and rejected intake.

The generated scaffold includes:

- `edgekit-profile.ts`
- `KnowledgeSidecar.astro`
- `harness-scenarios.json`
- `edgekit-recipe.json`
- `README.md`

## Adding A New Recipe

Add recipes only when they represent a repeatable adoption path. Good candidates:

- Framework install paths: Astro, Next.js, Remix, Vite React, Vue, Svelte.
- App workflow paths: ecommerce, CRM admin, ERP field ops, support, booking, onboarding.
- Knowledge paths: Markdown, CMS, local embeddings, LlamaIndex, Qdrant, Neo4j GraphRAG.

Avoid recipes that only patch one demo. A good recipe should be useful to another app with minimal renaming.

## Recipe Quality Bar

A recipe is release-ready when:

- Generated files are readable and small.
- Host-app ownership boundaries are explicit.
- Risky mutations are approval-gated.
- Knowledge answers require citations/freshness when retrieval is present.
- A coding agent can follow the recipe without asking for private repo context.
- Outcome scenarios can be copied into the harness and extended.
