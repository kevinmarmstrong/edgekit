/**
 * Public Catalog Shopping Mission Profile + Skills
 *
 * This is the canonical example of localizing an Edgekit agent workflow using the
 * Skills + Mission Profile pattern.
 *
 * The goal of this profile is to enable high-quality "agent does useful work"
 * and "answers questions about the catalog" experiences using local models by default.
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

import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit-skills'

export const productSearchSkill = createSkill({
  id: 'product-search',
  name: 'Search Product Catalog',
  description: 'Search the existing product catalog for price, size, color, availability, product fit, and comparison questions.',
  instructions: [
    'Use the catalog search tool before answering product availability or price questions.',
    'Preserve every user-requested attribute in the visible answer and any action card: product name, price, available sizes, colorway, and stock/availability signal.',
    'For search-only prompts, never mutate the cart; offer an action card or ask for the missing variant instead.',
    'If multiple products match, compare the relevant options instead of collapsing to a single unrelated item.',
  ].join(' '),
  activationExamples: [
    'how much are Nike dunks and what sizes are carried?',
    'show running shoes under $100 size 10',
    'do you carry size 11 white/black dunk lows?',
    'which daily trainer is cheaper and available in 10.5?',
  ],
  doNotActivateWhen: [
    'The user is asking how Edgekit works or how to integrate it.',
    'The user is asking to change an admin account plan or suspension state.',
  ],
  requiredTools: ['searchProducts'],
  examples: [
    { input: { query: 'running shoes under $100 in size 10' } },
    { input: { query: 'white Nike Dunk Low', size: '9' } },
  ],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: {
    requiredFacts: ['price', 'sizes', 'color'],
    preferredStyle: 'explicit',
  },
  uiAffordances: { preferActionCards: true },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: {
    slowStatePaths: ['policy', 'instructions.safety'],
    fastStatePaths: ['description', 'instructions', 'activationExamples', 'doNotActivateWhen', 'synthesis'],
    maxPatchOperations: 8,
  },
  meta: { category: 'catalog', version: '1.1.0' },
})

export const addToCartSkill = createSkill({
  id: 'add-to-cart',
  name: 'Add to Cart',
  description: 'Add a specific product variant to the cart. This is a mutating action and always requires explicit user approval.',
  instructions: [
    'Only run after the user selects or clearly names a specific product variant and size.',
    'Always keep the approval prompt visible before mutation.',
    'After approval, confirm the exact product, quantity, and selected size.',
    'After rejection, preserve cart state and acknowledge that nothing was added.',
  ].join(' '),
  activationExamples: [
    'add the white/black dunk low in size 9 to my cart',
    'yes, add size 11 please',
    'cart one pair of Nike Dunks size nine',
  ],
  doNotActivateWhen: [
    'The user only asks for price or available sizes.',
    'The requested product or size is ambiguous.',
    'The user asks to bypass approval or silently mutate state.',
  ],
  requiredTools: ['addToCart'],
  policy: {
    needsApproval: true,
    riskLevel: 'medium',
    approvalMessage: 'Add this item to your cart?',
  },
  uiAffordances: { preferActionCards: true },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: {
    slowStatePaths: ['policy', 'instructions.safety'],
    fastStatePaths: ['description', 'instructions', 'activationExamples', 'doNotActivateWhen'],
    maxPatchOperations: 8,
  },
  meta: { category: 'commerce', version: '1.1.0' },
})

export const publicCatalogShoppingProfile = createMissionProfile({
  id: 'public-catalog-shopping-v1',
  mission: 'public-catalog-shopping',
  version: '1.0.0',
  systemPrompt: `You are a concise shopping assistant for an existing product catalog.
Always use the product search capability before answering catalog questions.
After receiving tool results, your final response MUST clearly restate the key facts the user asked about (price, available sizes, colorway, and any stock/availability signals) using the exact data returned by the tool. Do not omit requested attributes.
Ask for explicit approval before performing any cart mutations.
Be precise and complete on attributes even when it makes the response slightly longer than the shortest possible answer.`,
  requiredTools: ['searchProducts', 'addToCart'],
  defaults: {
    downloadPolicy: 'never',
    toolChoice: 'required',
  },
  synthesis: {
    requiredAttributes: ['price', 'sizes', 'color'],
    style: 'explicit',
  },
  meta: {
    description: 'Public-facing agent workflow for browsing and purchasing from a product catalog. Optimized for local models with high synthesis faithfulness.',
    compatibility: '^0.3.0',
  },
})
