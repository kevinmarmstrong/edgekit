import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(repoRoot, 'research-results/package-smoke')
const packsDir = resolve(outDir, 'packs')
const appDir = resolve(tmpdir(), `edgekit-fresh-app-${Date.now()}`)
const fixtureDir = resolve(repoRoot, 'tests/fixtures/fresh-app')
const packages = [
  { dir: 'packages/core', name: '@kevinmarmstrong/edgekit' },
  { dir: 'packages/skills', name: '@kevinmarmstrong/edgekit-skills' },
  { dir: 'packages/knowledge', name: '@kevinmarmstrong/edgekit-knowledge' },
  { dir: 'packages/governance', name: '@kevinmarmstrong/edgekit-governance' },
  { dir: 'packages/mcp', name: '@kevinmarmstrong/edgekit-mcp' },
  { dir: 'packages/agui', name: '@kevinmarmstrong/edgekit-agui' },
  { dir: 'packages/ui', name: '@kevinmarmstrong/edgekit-ui' },
  { dir: 'packages/react', name: '@kevinmarmstrong/edgekit-react' },
  { dir: 'packages/cli', name: '@kevinmarmstrong/edgekit-cli' },
]

await rm(outDir, { recursive: true, force: true })
await mkdir(packsDir, { recursive: true })

for (const item of packages) {
  await run('pnpm', ['--dir', item.dir, 'pack', '--pack-destination', packsDir], repoRoot)
}

await cp(fixtureDir, appDir, { recursive: true })

const manifestPath = resolve(appDir, 'package.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
for (const item of packages) {
  manifest.dependencies[item.name] = `file:${resolve(packsDir, await packageTarball(item))}`
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

await run('npm', ['install'], appDir)
await run('npm', ['run', 'typecheck'], appDir)
await run('npm', ['run', 'build'], appDir)

console.log(`Fresh app package smoke passed: ${appDir}`)

async function packageTarball(item) {
  const manifest = JSON.parse(await readFile(resolve(repoRoot, item.dir, 'package.json'), 'utf8'))
  return `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
}

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env })
    child.on('error', rejectRun)
    child.on('exit', code => {
      if (code === 0) resolveRun()
      else rejectRun(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}
