import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const warnings = []

const audiences = new Set(['adopter', 'contributor', 'maintainer', 'thesis'])
const runtimeCapabilities = [
  'createAgent',
  'chromeAI',
  'webLLM',
  'createModelProvider',
  'resolveModel',
  'createCascadeReadinessController',
  'tool',
  'stepCountIs',
  'modelOptional',
  'resolveSessionContext',
]

const budgets = {
  core: 1800,
  skills: 600,
  knowledge: 800,
  governance: 900,
  mcp: 400,
  agui: 500,
  ui: 1400,
  react: 300,
  cli: 700,
}

checkReadmeLength()
checkDocAudiences()
checkPublicProofLanguage()
checkPublicSiteQaPath()
checkCoreInventory()
checkPackageBudgets()
checkSiblingDependencies()

for (const warning of warnings) console.warn(`v3.5 warning: ${warning}`)

if (failures.length) {
  console.error('v3.5 constraints failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('v3.5 constraints passed')

function checkReadmeLength() {
  const readme = read('README.md')
  const lines = readme.trimEnd().split('\n').length
  if (lines > 120) failures.push(`README.md has ${lines} lines; Phase G budget is <=120`)
}

function checkDocAudiences() {
  // Scope is intentionally Markdown only: root *.md, docs/**/*.md, docs/**/SKILL.md,
  // and .github/**/*.md. Mermaid diagrams, CSV inventories, JSON fixtures, and TS
  // templates are generated or code artifacts and do not carry Audience headers.
  const files = [
    ...rootMarkdownFiles(),
    ...walk(path.join(root, 'docs')).filter(file => file.endsWith('.md') || path.basename(file) === 'SKILL.md'),
    ...walk(path.join(root, '.github')).filter(file => file.endsWith('.md')),
  ]

  for (const file of files) {
    const rel = relative(file)
    const firstLine = read(rel).split('\n')[0]
    const match = firstLine.match(/^Audience: (adopter|contributor|maintainer|thesis)$/)
    if (!match) {
      failures.push(`${rel} must start with Audience: <adopter | contributor | maintainer | thesis>`)
      continue
    }
    if (!audiences.has(match[1])) failures.push(`${rel} has unsupported audience ${match[1]}`)
  }
}

function checkPublicProofLanguage() {
  const files = [
    'README.md',
    'lab/proofs/REPRODUCIBILITY.md',
    'lab/proofs/DISTRIBUTION-READINESS.md',
    'site/src/docsContent.ts',
  ]
  const banned = [
    [/average score 1\.0/i, 'average score 1.0'],
    [/shipReady/i, 'shipReady'],
    [/ship ready/i, 'ship ready'],
    [/world-class proof/i, 'world-class proof'],
  ]
  for (const file of files) {
    const text = read(file)
    for (const [pattern, label] of banned) {
      if (pattern.test(text)) failures.push(`${file} still uses public proof framing "${label}"`)
    }
  }
}

function checkPublicSiteQaPath() {
  const docs = read('site/src/docsContent.ts')
  const llmsGenerator = read('site/vite.config.ts')
  const skill = read('docs/agent-skills/edgekit-public-site-qa/SKILL.md')
  const contract = read('docs/adopter/PUBLIC-SITE-QA-CONTRACT.md')
  const requiredDocs = [
    'createGroundedQaSkill',
    '@kevinmarmstrong/edgekit-ui/lite',
    'agentIdentity',
    'grounding: "strict"',
    'callTool',
  ]
  for (const needle of requiredDocs) {
    if (!docs.includes(needle)) failures.push(`site docs must expose public-site Q&A primitive ${needle}`)
  }
  if (!llmsGenerator.includes('/docs/public-site-qa.md') || !llmsGenerator.includes('edgekit-public-site-qa')) {
    failures.push('llms.txt generation must route website-first installers to public-site Q&A docs and skill')
  }
  if (!skill.includes('Read First') || !skill.includes('https://kevinmarmstrong.github.io/edgekit/docs/public-site-qa/')) {
    failures.push('public-site Q&A agent skill must point installers at the public docs path')
  }
  if (!contract.includes('Regression Prompts') || !contract.includes('are you Gemma?')) {
    failures.push('public-site Q&A contract must include identity/grounding regression prompts')
  }
}

function checkCoreInventory() {
  const summary = read('docs/v3.5/core-export-classification-summary.md')
  const keepCore = Number(summary.match(/\| KEEP-CORE \| (\d+) \|/)?.[1] ?? NaN)
  if (!Number.isFinite(keepCore)) failures.push('core export summary is missing KEEP-CORE count')
  else if (keepCore > 40) failures.push(`KEEP-CORE count is ${keepCore}; budget is <=40`)

  const adr = read('docs/adrs/core-runtime-capabilities.md')
  for (const name of runtimeCapabilities) {
    if (!adr.includes(`\`${name}\``)) {
      failures.push(`runtime capability ${name} is missing from docs/adrs/core-runtime-capabilities.md`)
    }
  }
}

function checkPackageBudgets() {
  for (const [pkg, budget] of Object.entries(budgets)) {
    const dir = path.join(root, 'packages', pkg, 'src')
    if (!fs.existsSync(dir)) continue
    const lines = walk(dir)
      .filter(file => /\.(ts|tsx|js|mjs|css)$/.test(file))
      .reduce((sum, file) => sum + readAbs(file).split('\n').length, 0)
    if (lines > budget) warnings.push(`packages/${pkg}/src has ${lines} LOC; budget is ${budget}. Review ADR-backed public surface before adding more.`)
  }
}

function checkSiblingDependencies() {
  const siblingAdrs = new Map([
    ['@kevinmarmstrong/edgekit-knowledge -> @kevinmarmstrong/edgekit-skills', 'docs/adrs/knowledge-depends-on-skills.md'],
    ['@kevinmarmstrong/edgekit-react -> @kevinmarmstrong/edgekit-skills', 'docs/adrs/react-depends-on-skills.md'],
    ['@kevinmarmstrong/edgekit-react -> @kevinmarmstrong/edgekit-ui', 'docs/adrs/react-depends-on-ui.md'],
    ['@kevinmarmstrong/edgekit-ui -> @kevinmarmstrong/edgekit-governance', 'docs/adrs/ui-depends-on-governance.md'],
    ['@kevinmarmstrong/edgekit-ui -> @kevinmarmstrong/edgekit-skills', 'docs/adrs/ui-depends-on-skills.md'],
  ])

  for (const pkg of fs.readdirSync(path.join(root, 'packages'))) {
    const packagePath = path.join(root, 'packages', pkg, 'package.json')
    if (!fs.existsSync(packagePath) || pkg === 'core') continue
    const manifest = JSON.parse(readAbs(packagePath))
    const packageName = manifest.name
    const deps = Object.keys(manifest.dependencies ?? {})
    const firstParty = deps.filter(dep => dep.startsWith('@kevinmarmstrong/edgekit') && dep !== '@kevinmarmstrong/edgekit')
    for (const dep of firstParty) {
      const key = `${packageName} -> ${dep}`
      const adrPath = siblingAdrs.get(key)
      if (!adrPath || !fs.existsSync(path.join(root, adrPath))) {
        failures.push(`${key} is a cross-package dependency without a dedicated ADR entry`)
      }
    }
  }
}

function rootMarkdownFiles() {
  return fs.readdirSync(root)
    .filter(name => name.endsWith('.md'))
    .map(name => path.join(root, name))
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'dist'].includes(entry.name)) continue
      walk(full, files)
    } else {
      files.push(full)
    }
  }
  return files
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function readAbs(file) {
  return fs.readFileSync(file, 'utf8')
}

function relative(file) {
  return path.relative(root, file)
}
