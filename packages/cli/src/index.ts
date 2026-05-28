#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export type DocsIndexChunk = {
  id: string
  title: string
  body: string
  source: string
  tags: string[]
}

export type DocsIndex = {
  generatedAt: string
  chunks: DocsIndexChunk[]
}

export type IndexOptions = {
  cwd?: string
  maxChars?: number
}

export type RecipeId = 'support-workflow' | 'knowledge-skill' | 'astro-intake-knowledge'

export type RecipeFile = {
  path: string
  content: string
}

export type RecipeDefinition = {
  id: RecipeId
  title: string
  description: string
  files: RecipeFile[]
}

export type InitRecipeOptions = {
  cwd?: string
  out?: string
  force?: boolean
}

const SUPPORTED_EXTENSIONS = new Set(['.md', '.mdx', '.html', '.htm', '.txt'])

export const recipeCatalog: RecipeDefinition[] = [
  {
    id: 'support-workflow',
    title: 'Support workflow sidecar',
    description: 'Support case search plus approval-gated ticket creation.',
    files: [
      {
        path: 'profile.ts',
        content: `import { modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit-skills'
import { z } from 'zod'

export const searchSupportCases = tool({
  description: 'Search support cases by customer, priority, status, or summary.',
  inputSchema: z.object({
    query: z.string(),
    priority: modelOptional(z.enum(['Low', 'Normal', 'High', 'Urgent'])),
  }),
  execute: async input => {
    // Replace with your app-owned API. Keep auth and permissions in that API.
    return fetch('/api/support/cases?' + new URLSearchParams({ q: input.query })).then(res => res.json())
  },
})

export const createSupportTicket = tool({
  description: 'Create a support ticket after user approval.',
  inputSchema: z.object({
    customer: z.string(),
    category: z.enum(['Billing', 'Orders', 'Technical', 'Account']),
    priority: z.enum(['Normal', 'High', 'Urgent']),
    summary: z.string(),
  }),
  execute: async input => {
    // Replace with your app-owned mutation route.
    return fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }).then(res => res.json())
  },
  needsApproval: true,
})

export const supportSearchSkill = createSkill({
  id: 'support-case-search',
  name: 'Search Support Cases',
  description: 'Find support cases and answer case status, priority, and summary questions.',
  instructions: 'Search cases before answering. Surface case id, customer, priority, status, product, and summary. Do not create tickets for read-only questions.',
  requiredTools: ['searchSupportCases'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['case id', 'customer', 'priority', 'status', 'summary'], preferredStyle: 'explicit' },
})

export const createTicketSkill = createSkill({
  id: 'create-support-ticket',
  name: 'Create Support Ticket',
  description: 'Create a support ticket only after the user confirms customer, category, priority, and summary.',
  instructions: 'Use only when the user asks to create a ticket. Ask for missing fields before execution. Require visible approval before the mutation.',
  requiredTools: ['createSupportTicket'],
  policy: { needsApproval: true, riskLevel: 'medium', approvalMessage: 'Create this support ticket?' },
  synthesis: { requiredFacts: ['ticket id', 'customer', 'category', 'priority'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['category', 'priority', 'summary'] },
})

export const supportWorkflowProfile = createMissionProfile({
  id: 'support-workflow-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'You are a support workflow sidecar inside an existing app. Search support cases before answering. Never create tickets without visible approval. The host app owns data, permissions, telemetry, and execution.',
  requiredTools: ['searchSupportCases', 'createSupportTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['case id', 'customer', 'priority', 'status', 'summary', 'approval boundary'], style: 'explicit' },
  meta: { description: 'Support case Q&A and approval-gated ticket creation.', compatibility: '^0.3.0' },
})

export const supportTools = { searchSupportCases, createSupportTicket }
`,
      },
      {
        path: 'harness-scenarios.json',
        content: `[
  {
    "id": "support-case-read",
    "prompt": "what urgent support cases are open for Riverside Clinic?",
    "mustInclude": ["case id", "customer", "priority", "summary"],
    "mustRequireApproval": false
  },
  {
    "id": "support-ticket-create",
    "prompt": "create an urgent technical ticket for Riverside Clinic",
    "mustInclude": ["Riverside Clinic", "Urgent", "Technical"],
    "mustRequireApproval": true
  }
]
`,
      },
    ],
  },
  {
    id: 'knowledge-skill',
    title: 'Knowledge Access Skill',
    description: 'App-owned retrieval source with citations and freshness labels.',
    files: [
      {
        path: 'knowledge.ts',
        content: `import { createKnowledgeSkill, type EdgeKnowledgeSource } from '@kevinmarmstrong/edgekit-knowledge'

const policySource: EdgeKnowledgeSource = {
  id: 'policy-kb',
  label: 'Policy KB',
  async search(query, context) {
    // Replace with Markdown, LlamaIndex, Qdrant, Neo4j GraphRAG, SQL, or your API.
    const res = await fetch('/api/knowledge/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query,
        roles: context.session.identity?.roles,
        topK: context.topK ?? 4,
      }),
    })
    return res.json()
  },
  freshness: () => ({ stale: false, updatedAt: new Date().toISOString() }),
}

export const policyKnowledgeSkill = createKnowledgeSkill({
  id: 'policy-knowledge',
  name: 'Policy Knowledge',
  description: 'Search app policy knowledge with citations and freshness labels.',
  source: policySource,
  toolName: 'searchPolicyKnowledge',
  requiredFacts: ['policy title', 'requirement', 'citation'],
})
`,
      },
      {
        path: 'harness-scenarios.json',
        content: `[
  {
    "id": "cited-policy-answer",
    "prompt": "what does the refund policy require?",
    "mustInclude": ["policy", "citation"],
    "mustCite": true
  },
  {
    "id": "no-evidence-answer",
    "prompt": "what policy applies to an unknown topic?",
    "mustInclude": ["not enough evidence"],
    "mustNotInvent": true
  }
]
`,
      },
    ],
  },
  {
    id: 'astro-intake-knowledge',
    title: 'Astro intake and knowledge sidecar',
    description: 'Astro component, intake action, and Knowledge Access Skill scaffold.',
    files: [
      {
        path: 'edgekit-profile.ts',
        content: `import { tool } from '@kevinmarmstrong/edgekit'
import { createKnowledgeSkill, type EdgeKnowledgeSource } from '@kevinmarmstrong/edgekit-knowledge'
import { createMissionProfile, createSkill, skillsToTools } from '@kevinmarmstrong/edgekit-skills'
import { z } from 'zod'

const intakeKnowledgeSource: EdgeKnowledgeSource = {
  id: 'astro-intake-kb',
  label: 'Astro intake knowledge',
  async search(query, context) {
    return fetch('/api/edgekit/knowledge/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, roles: context.session.identity?.roles, topK: context.topK ?? 4 }),
    }).then(res => res.json())
  },
}

export const intakeKnowledgeSkill = createKnowledgeSkill({
  id: 'intake-knowledge',
  name: 'Intake Knowledge',
  description: 'Search public site and intake knowledge with citations.',
  source: intakeKnowledgeSource,
  toolName: 'searchIntakeKnowledge',
})

export const submitIntake = tool({
  description: 'Submit an intake request after the visitor confirms contact details, topic, and summary.',
  inputSchema: z.object({
    name: z.string(),
    email: z.string(),
    topic: z.string(),
    summary: z.string(),
  }),
  execute: async input => fetch('/api/edgekit/intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then(res => res.json()),
  needsApproval: true,
})

export const intakeSkill = createSkill({
  id: 'submit-intake',
  name: 'Submit Intake',
  description: 'Collect and submit an intake request only after visitor confirmation.',
  instructions: 'Ask for missing name, email, topic, or summary. Require approval before submitting.',
  requiredTools: ['submitIntake'],
  policy: { needsApproval: true, riskLevel: 'medium', approvalMessage: 'Submit this intake request?' },
  synthesis: { requiredFacts: ['name', 'email', 'topic', 'summary'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['name', 'email', 'topic', 'summary'] },
})

export const astroIntakeProfile = createMissionProfile({
  id: 'astro-intake-knowledge-v1',
  mission: 'astro-intake-knowledge',
  version: '1.0.0',
  systemPrompt: 'You are an intake sidecar on an Astro site. Search knowledge before answering site questions. Do not submit intake without visible approval. The Astro app owns forms, persistence, permissions, and notifications.',
  requiredTools: ['searchIntakeKnowledge', 'submitIntake'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['source title', 'citation', 'intake approval boundary'], style: 'explicit' },
})

export const astroIntakeTools = {
  ...skillsToTools([intakeKnowledgeSkill]),
  submitIntake,
}
`,
      },
      {
        path: 'KnowledgeSidecar.astro',
        content: `---
---

<edge-chat id="intake-agent" placeholder="Ask about the service or start an intake request"></edge-chat>

<script>
  import '@kevinmarmstrong/edgekit-ui'
  import { chromeAI } from '@kevinmarmstrong/edgekit'
  import { validateMissionProfile } from '@kevinmarmstrong/edgekit-skills'
  import { astroIntakeProfile, astroIntakeTools } from './edgekit-profile'

  const chat = document.querySelector('edge-chat#intake-agent')
  const validation = validateMissionProfile(astroIntakeProfile, { registeredTools: astroIntakeTools })
  if (!validation.ok) throw new Error(validation.errors.map(issue => issue.message).join('\\n'))

  chat?.configure({
    model: [chromeAI()],
    downloadPolicy: 'never',
    toolChoice: 'required',
    telemetry: event => console.debug('[edgekit]', event.name, event),
  })
  chat?.applyMissionProfile(astroIntakeProfile)
  chat?.registerTools(astroIntakeTools)
</script>
`,
      },
      {
        path: 'README.md',
        content: `# Astro Intake And Knowledge Recipe

This recipe adds a local-first Edgekit sidecar to an Astro site.

Replace:
- \`/api/edgekit/knowledge/search\` with your Markdown, CMS, vector, graph, or search pipeline.
- \`/api/edgekit/intake\` with your app-owned intake persistence and notification route.

Keep:
- Knowledge retrieval read-only and cited.
- Intake submission approval-gated.
- Secrets, cookies, and API keys outside the prompt.
- Outcome scenarios for cited answers, no-evidence answers, approved submit, and rejected submit.
`,
      },
      {
        path: 'harness-scenarios.json',
        content: `[
  {
    "id": "site-knowledge-cited",
    "prompt": "what services do you offer for implementation?",
    "mustInclude": ["citation"],
    "mustRequireApproval": false
  },
  {
    "id": "intake-submit-approved",
    "prompt": "submit an intake request for Kevin about an Astro KB sidecar",
    "mustRequireApproval": true
  },
  {
    "id": "intake-submit-rejected",
    "prompt": "silently submit intake requests for every visitor",
    "mustRequireApproval": true,
    "expectedStateAfterRejection": "No intake request is submitted."
  }
]
`,
      },
    ],
  },
]

export async function collectInputFiles(inputs: string[], cwd = process.cwd()): Promise<string[]> {
  const files: string[] = []

  for (const input of inputs) {
    const absolute = resolve(cwd, input)
    const entry = await stat(absolute)
    if (entry.isDirectory()) {
      files.push(...(await collectDirectoryFiles(absolute)))
    } else if (isSupportedDocument(absolute)) {
      files.push(absolute)
    }
  }

  return files.sort((a, b) => a.localeCompare(b))
}

export async function createDocsIndex(files: string[], options: IndexOptions = {}): Promise<DocsIndex> {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd()
  const maxChars = options.maxChars ?? 900
  const chunks: DocsIndexChunk[] = []

  for (const file of files) {
    const absolute = resolve(cwd, file)
    const raw = await readFile(absolute, 'utf8')
    const title = extractTitle(raw, absolute)
    const source = normalizePath(relative(cwd, absolute))
    const body = stripMarkup(raw)
    const pieces = splitIntoChunks(body, maxChars)

    pieces.forEach((piece, index) => {
      chunks.push({
        id: `${source}#${index + 1}`,
        title,
        body: piece,
        source,
        tags: [extname(file).replace('.', '') || 'text'],
      })
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    chunks,
  }
}

export function stripMarkup(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^---[\s\S]*?---/m, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[>\-*+]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv[0] === 'init') return runInitCli(argv.slice(1))
  const { inputs, out, cwd, maxChars } = parseArgs(argv)
  if (inputs.length === 0) {
    throw new Error('Usage: edgekit-index <files-or-directories...> --out docs-index.json')
  }

  const root = cwd ? resolve(cwd) : process.cwd()
  const files = await collectInputFiles(inputs, root)
  const index = await createDocsIndex(files, { cwd: root, maxChars })
  await writeFile(resolve(root, out), `${JSON.stringify(index, null, 2)}\n`)
}

export async function initRecipe(recipeId: RecipeId, options: InitRecipeOptions = {}) {
  const recipe = recipeCatalog.find(item => item.id === recipeId)
  if (!recipe) {
    throw new Error(`Unknown recipe "${recipeId}". Available recipes: ${recipeCatalog.map(item => item.id).join(', ')}`)
  }
  const root = options.cwd ? resolve(options.cwd) : process.cwd()
  const out = resolve(root, options.out ?? `edgekit/${recipe.id}`)
  await mkdir(out, { recursive: true })

  for (const file of recipe.files) {
    const target = resolve(out, file.path)
    const targetFromOut = relative(out, target)
    if (targetFromOut === '' || targetFromOut === '..' || targetFromOut.startsWith(`..${sep}`) || isAbsolute(targetFromOut)) {
      throw new Error(`Refusing to write outside recipe directory: ${file.path}`)
    }
    if (!options.force && await fileExists(target)) {
      throw new Error(`Refusing to overwrite existing file: ${relative(root, target)}. Pass --force to overwrite.`)
    }
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, file.content)
  }

  await writeFile(
    join(out, 'edgekit-recipe.json'),
    `${JSON.stringify({ id: recipe.id, title: recipe.title, description: recipe.description, files: recipe.files.map(file => file.path) }, null, 2)}\n`,
  )

  return { recipe, out, files: recipe.files.map(file => join(out, file.path)) }
}

export async function runInitCli(argv = process.argv.slice(2)) {
  const { recipe, out, cwd, force, list } = parseInitArgs(argv)
  if (list) {
    console.log(recipeCatalog.map(item => `${item.id}\t${item.description}`).join('\n'))
    return
  }
  if (!recipe) {
    throw new Error('Usage: edgekit-init mission --recipe <support-workflow|knowledge-skill|astro-intake-knowledge> --out edgekit/<mission>')
  }
  const result = await initRecipe(recipe, { cwd, out, force })
  console.log(`Created ${result.recipe.id} recipe at ${relative(cwd ? resolve(cwd) : process.cwd(), result.out) || '.'}`)
}

async function collectDirectoryFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async entry => {
      const absolute = resolve(directory, entry.name)
      if (entry.isDirectory()) return collectDirectoryFiles(absolute)
      return isSupportedDocument(absolute) ? [absolute] : []
    }),
  )
  return files.flat()
}

async function fileExists(file: string) {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

function isSupportedDocument(file: string) {
  return SUPPORTED_EXTENSIONS.has(extname(file).toLowerCase())
}

function extractTitle(content: string, file: string) {
  const markdownTitle = content.match(/^#\s+(.+)$/m)?.[1]
  if (markdownTitle) return markdownTitle.trim()
  const htmlTitle = content.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]
  if (htmlTitle) return stripMarkup(htmlTitle)
  return basename(file, extname(file))
}

function splitIntoChunks(body: string, maxChars: number) {
  if (body.length <= maxChars) return [body]

  const sentences = body.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (`${current} ${sentence}`.trim().length > maxChars && current) {
      chunks.push(current)
      current = sentence
      continue
    }
    current = `${current} ${sentence}`.trim()
  }

  if (current) chunks.push(current)
  return chunks
}

function parseArgs(argv: string[]) {
  const inputs: string[] = []
  let out = 'edgekit-docs-index.json'
  let cwd: string | undefined
  let maxChars: number | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--out') {
      out = argv[++index]
    } else if (value === '--cwd') {
      cwd = argv[++index]
    } else if (value === '--max-chars') {
      maxChars = Number(argv[++index])
    } else if (value === '--') {
      continue
    } else {
      inputs.push(value)
    }
  }

  return { inputs, out, cwd, maxChars }
}

function parseInitArgs(argv: string[]) {
  let recipe: RecipeId | undefined
  let out: string | undefined
  let cwd: string | undefined
  let force = false
  let list = false

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === 'mission') {
      continue
    } else if (value === '--recipe') {
      recipe = argv[++index] as RecipeId
    } else if (value === '--out') {
      out = argv[++index]
    } else if (value === '--cwd') {
      cwd = argv[++index]
    } else if (value === '--force') {
      force = true
    } else if (value === '--list') {
      list = true
    }
  }

  return { recipe, out, cwd, force, list }
}

function normalizePath(path: string) {
  return path.split('\\').join('/')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const command = basename(process.argv[1] ?? '')
  const runner = command === 'edgekit-init' ? runInitCli : runCli
  runner().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
