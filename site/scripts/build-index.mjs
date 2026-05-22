import { buildIndex } from '@edgekit/cli'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(__dirname, '..')

const index = await buildIndex({
  contentDir: path.join(siteRoot, 'src/pages'),
  outputDir: path.join(siteRoot, 'public'),
  chunkSize: 400,
  chunkOverlap: 50,
})

console.log(`Built content index: ${index.metadata.totalChunks} chunks, hash ${index.contentHash}`)
