/**
 * Docs Q&A Mission Profile + Skills
 *
 * Second mission example using the Skills + Mission Profile pattern.
 * This demonstrates reusability of the architecture across very different
 * mission types (catalog shopping vs project documentation Q&A).
 *
 * NOTE ON CURRENT API STATUS (Wave 0 - 2026-05):
 * The `synthesis`, `policy`, and `uiAffordances` fields on Skills and Profiles
 * are currently **recommended authoring contracts** only.
 *
 * They are not yet consumed by the Edgekit runtime for enforcement.
 * They exist so that:
 *   - Developers and agents have a clear place to express intent.
 *   - Future runtime features (automatic approval gates, faithfulness checks,
 *     UI rendering hints) can consume them without breaking changes.
 *
 * Until runtime support lands, these fields are documentation + future-proofing.
 * Executable behavior (approvals, tool execution, rendering) is still controlled
 * via the normal `registerTools`, `registerActions`, and `configure()` paths.
 * Use `requiredTools` to name the app-owned executable tools a profile expects.
 */

import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const searchDocsSkill = createSkill({
  id: 'search-docs',
  name: 'Search Edgekit Documentation',
  description: 'Search Edgekit docs for integration, local-first economics, security boundaries, testing, agentic workflows, and Skill optimization questions.',
  instructions: [
    'Search documentation before answering project questions, then synthesize the answer instead of dumping snippets.',
    'When asked how to build with Edgekit, name Skills, Mission Profiles, <edge-chat> or framework wrappers, registerTools, approvals, and the outcome harness.',
    'When asked about value, explain local-first economics, privacy, latency, browser models, and explicit cloud fallback without framing Edgekit as a SaaS subscription sale.',
    'When asked about Skill optimization, describe live transcript data, per-skill scoring, bounded patches, held-out validation, ties rejected, protected slow-state sections, and redeploy testing.',
  ].join(' '),
  activationExamples: [
    'how will this help me add an agent to my app?',
    'is Edgekit just search or RAG?',
    'how do I optimize Skills after testing GitHub Pages?',
    'should JWTs or database credentials go into the prompt?',
    'what problem does Edgekit solve for token costs?',
  ],
  doNotActivateWhen: [
    'The user is asking to search a product catalog or add a product to cart.',
    'The user is asking to mutate an admin account.',
    'The user is asking for a generic UI form unrelated to Edgekit docs.',
  ],
  requiredTools: ['searchDocs'],
  examples: [
    { input: { query: 'what problem does edgekit solve for token costs?' } },
  ],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: {
    requiredFacts: ['relevant sections', 'key concepts'],
    preferredStyle: 'explicit',
  },
  protectedSections: ['policy', 'instructions.safety', 'systemPrompt.safety'],
  optimization: {
    slowStatePaths: ['policy', 'instructions.safety', 'systemPrompt.safety'],
    fastStatePaths: ['description', 'instructions', 'activationExamples', 'doNotActivateWhen', 'synthesis'],
    maxPatchOperations: 8,
  },
  meta: { category: 'documentation', version: '1.1.0' },
})

export const docsQaProfile = createMissionProfile({
  id: 'docs-qa-v1',
  mission: 'docs-qa',
  version: '1.0.0',
  systemPrompt: `You are a precise documentation assistant for the edgekit project.
Always search the documentation before answering.
Your answers must cite the specific sections or concepts used and stay faithful to the source material.
Do not hallucinate features or APIs that are not present in the retrieved documentation.
Be concise but complete.`,
  requiredTools: ['searchDocs'],
  defaults: {
    downloadPolicy: 'never',
    toolChoice: 'required',
  },
  synthesis: {
    requiredAttributes: ['relevant sections'],
    style: 'explicit',
  },
  meta: {
    description: 'Q&A agent workflow over the edgekit documentation. Optimized for faithful retrieval and citation when using local models.',
    compatibility: '^0.1.0',
  },
})
