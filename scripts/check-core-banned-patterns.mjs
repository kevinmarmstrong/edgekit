import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('packages/core/src')

function collectFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(absolute)
    return entry.isFile() && entry.name.endsWith('.ts') ? [absolute] : []
  })
}

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0
}

const files = collectFiles(root)
const allCore = files.map(file => fs.readFileSync(file, 'utf8')).join('\n')
const agent = fs.readFileSync(path.join(root, 'agent.ts'), 'utf8')
const aguiCompat = fs.readFileSync(path.join(root, 'compat/agui.ts'), 'utf8')

const checks = [
  {
    name: 'messages.push in core/src',
    count: countMatches(allCore, /messages\.push/g),
    max: 0,
    next: 'Use AI SDK response messages and immutable transcript replacement instead of custom message mutation.',
  },
  {
    name: 'as unknown as ModelMessage casts in core/src',
    count: countMatches(allCore, /as unknown as ModelMessage/g),
    max: 0,
    next: 'Use AI SDK ModelMessage-compatible values directly.',
  },
  {
    name: 'hand-rolled agent while(true) orchestration loops',
    count: countMatches(agent, /while\s*\(\s*true\s*\)/g),
    max: 0,
    next: 'Use AI SDK stopWhen, prepareStep, and repair hooks instead of custom orchestration loops.',
  },
  {
    name: 'legacy AG-UI SSE parser markers',
    count: countMatches(aguiCompat, /buffer\.split\(\s*\/\\r\?\\n\//g),
    max: 0,
    next: 'Use @ag-ui/client through @kevinmarmstrong/edgekit-agui instead of root SSE parsing.',
  },
]

let failed = false
for (const check of checks) {
  if (check.count > check.max) {
    failed = true
    console.error(`${check.name}: ${check.count} exceeds allowed maximum ${check.max}. ${check.next}`)
  } else {
    console.log(`${check.name}: ${check.count}/${check.max}`)
  }
}

if (failed) process.exit(1)
