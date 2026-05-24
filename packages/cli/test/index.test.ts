import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { collectInputFiles, createDocsIndex, stripMarkup } from '../src/index'

describe('stripMarkup', () => {
  it('turns markdown and html into searchable plain text', () => {
    expect(stripMarkup('# Install\n\nUse `edgekit-index` with <strong>docs</strong>.')).toBe(
      'Install Use edgekit-index with docs.',
    )
  })
})

describe('createDocsIndex', () => {
  it('indexes files into titled chunks with source paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'edgekit-cli-'))
    try {
      const file = join(root, 'README.md')
      await writeFile(
        file,
        '# Edgekit\n\nBrowser-native agents for existing apps.\n\n## Tools\n\nRegister app APIs as tools.',
      )

      const index = await createDocsIndex([file], { cwd: root, maxChars: 48 })

      expect(index.chunks.length).toBeGreaterThan(1)
      expect(index.chunks[0]).toMatchObject({
        title: 'Edgekit',
        source: 'README.md',
      })
      expect(index.chunks.map(chunk => chunk.body).join(' ')).toContain('Register app APIs as tools')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('collects only supported document files from directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'edgekit-cli-'))
    try {
      await writeFile(join(root, 'guide.md'), '# Guide')
      await writeFile(join(root, 'index.html'), '<h1>Site</h1>')
      await writeFile(join(root, 'package.json'), '{}')

      await expect(collectInputFiles([root])).resolves.toHaveLength(2)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('writes a json index from the cli entrypoint', async () => {
    const root = await mkdtemp(join(tmpdir(), 'edgekit-cli-'))
    try {
      const input = join(root, 'docs.md')
      const output = join(root, 'docs-index.json')
      await writeFile(input, '# Docs\n\nEdgekit docs content.')

      const { runCli } = await import('../src/index')
      await runCli([input, '--out', output, '--cwd', root])

      const payload = JSON.parse(await readFile(output, 'utf8')) as { chunks: unknown[] }
      expect(payload.chunks).toHaveLength(1)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
