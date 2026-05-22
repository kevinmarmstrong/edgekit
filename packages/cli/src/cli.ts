#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'
import { buildIndex, initProject } from './index.js'

const args = process.argv.slice(2)
const command = args[0]

async function main() {
  switch (command) {
    case 'init': {
      const dir = args[1] ?? process.cwd()
      await initProject(dir)
      console.log('Created edgekit.config.json and content/ directory')
      break
    }
    case 'build': {
      const configPath = path.resolve(args[1] ?? 'edgekit.config.json')
      if (!fs.existsSync(configPath)) {
        console.error(`Config not found: ${configPath}`)
        console.error('Run "npx @edgekit/cli init" first')
        process.exit(1)
      }
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      const index = await buildIndex({
        contentDir: path.resolve(path.dirname(configPath), config.contentDir),
        outputDir: path.resolve(path.dirname(configPath), config.outputDir),
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
      })
      console.log(`Built index: ${index.metadata.totalChunks} chunks, hash ${index.contentHash}`)
      break
    }
    default:
      console.log('Usage: edgekit <command>')
      console.log('')
      console.log('Commands:')
      console.log('  init [dir]      Create config file and content directory')
      console.log('  build [config]  Build content index from markdown files')
      process.exit(command ? 1 : 0)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
