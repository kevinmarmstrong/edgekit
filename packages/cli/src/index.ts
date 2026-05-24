#!/usr/bin/env node
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, relative, resolve } from 'node:path'
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

const SUPPORTED_EXTENSIONS = new Set(['.md', '.mdx', '.html', '.htm', '.txt'])

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
  const { inputs, out, cwd, maxChars } = parseArgs(argv)
  if (inputs.length === 0) {
    throw new Error('Usage: edgekit-index <files-or-directories...> --out docs-index.json')
  }

  const root = cwd ? resolve(cwd) : process.cwd()
  const files = await collectInputFiles(inputs, root)
  const index = await createDocsIndex(files, { cwd: root, maxChars })
  await writeFile(resolve(root, out), `${JSON.stringify(index, null, 2)}\n`)
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

function normalizePath(path: string) {
  return path.split('\\').join('/')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runCli().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
