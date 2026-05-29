#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const packagesRoot = join(repoRoot, 'packages')
const scanDirs = ['src', 'test']
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

const demoCanaries = [
  { label: 'Ohio Software demo proper noun', pattern: /\bOhio Software\b/g },
  { label: 'rockets demo canary', pattern: /\brockets\b/gi },
  { label: 'same Kevin identity canary', pattern: /\bsame Kevin\b/gi },
  { label: 'Kevin site assistant demo identity', pattern: /\bKevin(?:'s)? site assistant\b/gi },
  { label: 'Kevin Armstrong identity canary', pattern: /\bKevin Armstrong\b/g },
  { label: 'Harness demo relationship proper noun', pattern: /\bHarness\b/g },
]

// Maintainer escape hatch for rare reusable package fixtures that must quote a
// demo canary exactly. Keep this list narrow: every entry needs a specific file,
// canary label, and reason explaining why the reusable package cannot use a
// varied/non-demo fixture instead. Do not allowlist production source without a
// linked maintainer review.
const maintainerAllowlist = [
  // Example:
  // {
  //   file: 'packages/core/test/example.test.ts',
  //   label: 'Harness demo relationship proper noun',
  //   reason: 'Regression fixture for issue #123; remove after the fixture is generalized.',
  // },
]

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute)))
      continue
    }
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(absolute)
    }
  }

  return files
}

function toRepoPath(file) {
  return relative(repoRoot, file).split(sep).join('/')
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length
}

function lineAt(text, lineNumber) {
  return text.split('\n')[lineNumber - 1]?.trim() ?? ''
}

function isAllowed(file, label) {
  return maintainerAllowlist.some((entry) => entry.file === file && entry.label === label && entry.reason)
}

const packageDirs = (await readdir(packagesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesRoot, entry.name))

const files = []
for (const packageDir of packageDirs) {
  for (const scanDir of scanDirs) {
    try {
      files.push(...(await listFiles(join(packageDir, scanDir))))
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
}

const violations = []

for (const absoluteFile of files) {
  const file = toRepoPath(absoluteFile)
  const source = await readFile(absoluteFile, 'utf8')

  for (const canary of demoCanaries) {
    canary.pattern.lastIndex = 0
    for (const match of source.matchAll(canary.pattern)) {
      if (isAllowed(file, canary.label)) continue
      const line = lineNumberForIndex(source, match.index ?? 0)
      violations.push({
        file,
        line,
        label: canary.label,
        match: match[0],
        snippet: lineAt(source, line),
      })
    }
  }
}

if (violations.length > 0) {
  console.error('Package canary boundary check failed.')
  console.error('Reusable packages must not contain demo-specific canary prompts or proper nouns in src/test fixtures.')
  console.error('Generalize the fixture/product property, move demo-specific text to a demo/app, or add a narrow maintainerAllowlist entry with a reason.')
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.label} (${JSON.stringify(violation.match)})`)
    console.error(`  ${violation.snippet}`)
  }
  process.exit(1)
}

console.log('package canary boundary: no demo canary terms found in packages/*/{src,test}')
