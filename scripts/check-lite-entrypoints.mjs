import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []

const heavyProviderMarkers = [
  '@browser-ai/web-llm',
  '@mlc-ai/web-llm',
  '@mediapipe/tasks-text',
  './providers/web-llm',
  './providers/chrome-ai',
]

checkPackageExport('packages/core/package.json', './lite')
checkPackageExport('packages/ui/package.json', './lite')
checkSideEffect('packages/ui/package.json', './dist/lite.js')
checkSideEffect('packages/ui/package.json', './dist/component-*.js')
checkNoMarkers('packages/core/src/lite.ts', heavyProviderMarkers)
checkNoMarkers('packages/ui/src/lite.ts', heavyProviderMarkers)
checkContains('packages/ui/src/lite.ts', "import './component'", 'UI lite must preserve custom-element registration side effects')
checkContains('packages/ui/src/component.ts', "@kevinmarmstrong/edgekit/lite", 'UI component must build on the lite core runtime')
checkContains('packages/ui/src/index.ts', "from '@kevinmarmstrong/edgekit'", 'main UI entry must preserve the default browser model cascade')
checkContains('packages/ui/src/index.ts', 'setEdgeChatDefaultAgentOptions', 'main UI entry must install browser model defaults outside the lite entry')
checkContains('site/src/docsContent.ts', "@kevinmarmstrong/edgekit-ui/lite", 'Getting Started must teach the public-site lite UI path')
checkContains('site/src/docsContent.ts', 'createGroundedQaSkill', 'Getting Started must teach the grounded Q&A primitive')
checkContains('site/src/siteAssistant.ts', 'EdgeChatElement', 'site assistant must keep a value import so bundlers preserve edge-chat registration')
checkContains('site/vite.config.ts', 'docs-public-site-qa', 'public-site Q&A docs page must have a static HTML build input')
checkContains('site/docs/public-site-qa/index.html', 'data-doc-page="public-site-qa"', 'public-site Q&A docs page must select the matching docs content page')
checkContains('site/vite.config.ts', '/docs/public-site-qa.md', 'llms.txt must point website-first installers at public-site Q&A')
checkContains('site/vite.config.ts', 'edgekit-public-site-qa', 'llms.txt must point agents at the public-site Q&A skill')
checkContains('docs/agent-skills/edgekit-public-site-qa/SKILL.md', 'createGroundedQaSkill', 'agent installer skill must teach the grounded Q&A primitive')

if (failures.length) {
  console.error('lite entrypoint checks failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('lite entrypoint checks passed')

function checkPackageExport(file, exportPath) {
  const manifest = JSON.parse(read(file))
  if (!manifest.exports?.[exportPath]) {
    failures.push(`${file} is missing exports["${exportPath}"]`)
  }
}

function checkSideEffect(file, entry) {
  const manifest = JSON.parse(read(file))
  if (!Array.isArray(manifest.sideEffects) || !manifest.sideEffects.includes(entry)) {
    failures.push(`${file} must mark ${entry} as side-effectful so <edge-chat> registration is not tree-shaken`)
  }
}

function checkNoMarkers(file, markers) {
  const text = read(file)
  for (const marker of markers) {
    if (text.includes(marker)) failures.push(`${file} includes heavy provider marker ${marker}`)
  }
}

function checkContains(file, needle, reason) {
  if (!read(file).includes(needle)) failures.push(`${file} is missing ${JSON.stringify(needle)} (${reason})`)
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}
