import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import type { ContentIndex, IndexedChunk, ChunkMetadata } from '@edgekit/core'

export interface CLIConfig {
  readonly contentDir: string
  readonly outputDir: string
  readonly chunkSize?: number
  readonly chunkOverlap?: number
}

const DEFAULT_CHUNK_SIZE = 500
const DEFAULT_CHUNK_OVERLAP = 50
const DEFAULT_CONFIG_FILENAME = 'edgekit.config.json'

export async function buildIndex(config: CLIConfig): Promise<ContentIndex> {
  const chunkSize = config.chunkSize ?? DEFAULT_CHUNK_SIZE
  const chunkOverlap = config.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP

  const files = findMarkdownFiles(config.contentDir)
  if (files.length === 0) {
    throw new Error(`No markdown files found in ${config.contentDir}`)
  }

  const allChunks: IndexedChunk[] = []

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const relativePath = path.relative(config.contentDir, filePath)
    const { title, body } = parseFrontmatter(raw)
    const textChunks = splitIntoChunks(body, chunkSize, chunkOverlap)

    for (const [i, chunkContent] of textChunks.entries()) {
      const metadata: ChunkMetadata = {
        source: relativePath,
        title: title ?? path.basename(filePath, path.extname(filePath)),
      }

      allChunks.push({
        id: `${relativePath}#${i}`,
        content: chunkContent,
        embedding: [],
        metadata,
      })
    }
  }

  const contentHash = hashContent(allChunks.map((c) => c.content).join(''))

  const index: ContentIndex = {
    version: '1.0',
    contentHash,
    chunks: allChunks,
    metadata: {
      createdAt: new Date().toISOString(),
      embeddingModel: 'none',
      dimensions: 0,
      totalChunks: allChunks.length,
    },
  }

  fs.mkdirSync(config.outputDir, { recursive: true })
  const outputPath = path.join(config.outputDir, 'content-index.json')
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2))

  return index
}

export async function initProject(dir: string): Promise<void> {
  const configPath = path.join(dir, DEFAULT_CONFIG_FILENAME)

  if (fs.existsSync(configPath)) {
    throw new Error(`Config already exists at ${configPath}`)
  }

  const config = {
    contentDir: './content',
    outputDir: './public',
    chunkSize: DEFAULT_CHUNK_SIZE,
    chunkOverlap: DEFAULT_CHUNK_OVERLAP,
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')

  const contentDir = path.join(dir, 'content')
  fs.mkdirSync(contentDir, { recursive: true })
}

function findMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Content directory does not exist: ${dir}`)
  }

  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findMarkdownFiles(fullPath))
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      results.push(fullPath)
    }
  }

  return results.sort()
}

function parseFrontmatter(raw: string): { title: string | null; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { title: null, body: raw }

  const frontmatter = match[1] ?? ''
  const body = match[2] ?? ''

  const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  return { title: titleMatch?.[1] ?? null, body }
}

function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    if (current.length + trimmed.length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      const words = current.split(/\s+/)
      const overlapWords = words.slice(-Math.floor(overlap / 5))
      current = overlapWords.join(' ') + ' ' + trimmed
    } else {
      current = current ? current + '\n\n' + trimmed : trimmed
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks.length > 0 ? chunks : [text.trim()].filter(Boolean)
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)
}
