#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, normalize, relative, resolve, sep } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const packagesRoot = join(repoRoot, 'packages')
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const importPattern =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^'"`]*?\s+from\s+)?["'`]([^"'`]+)["'`]|\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)|\brequire\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)))
      continue
    }
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

function isForbiddenImport(specifier, file) {
  if (specifier.startsWith('site/') || specifier.startsWith('examples/')) {
    return true
  }

  if (!specifier.startsWith('.')) {
    return false
  }

  const resolved = normalize(resolve(file, '..', specifier))
  const fromRoot = relative(repoRoot, resolved).split(sep).join('/')
  return fromRoot === 'site' || fromRoot.startsWith('site/') || fromRoot === 'examples' || fromRoot.startsWith('examples/')
}

const packageDirs = (await readdir(packagesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesRoot, entry.name, 'src'))

const violations = []

for (const sourceDir of packageDirs) {
  let files = []
  try {
    files = await listFiles(sourceDir)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      continue
    }
    throw error
  }

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1] ?? match[2] ?? match[3]
      if (specifier && isForbiddenImport(specifier, file)) {
        violations.push(`${relative(repoRoot, file)} imports ${specifier}`)
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Demo isolation check failed.')
  console.error('packages/*/src/** must not import from site/** or examples/**.')
  console.error('Keep demo dependencies flowing from demos into packages, not back into runtime packages.')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log('demo isolation: packages/*/src/** has no site/** or examples/** imports')
