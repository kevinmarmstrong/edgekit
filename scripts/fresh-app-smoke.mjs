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
  { dir: 'packages/core', name: '@kevinmarmstrong/edgekit', tarball: 'kevinmarmstrong-edgekit-0.1.0.tgz' },
  { dir: 'packages/skills', name: '@kevinmarmstrong/edgekit-skills', tarball: 'kevinmarmstrong-edgekit-skills-0.1.0.tgz' },
  { dir: 'packages/knowledge', name: '@kevinmarmstrong/edgekit-knowledge', tarball: 'kevinmarmstrong-edgekit-knowledge-0.1.0.tgz' },
  { dir: 'packages/governance', name: '@kevinmarmstrong/edgekit-governance', tarball: 'kevinmarmstrong-edgekit-governance-0.1.0.tgz' },
  { dir: 'packages/mcp', name: '@kevinmarmstrong/edgekit-mcp', tarball: 'kevinmarmstrong-edgekit-mcp-0.1.0.tgz' },
  { dir: 'packages/agui', name: '@kevinmarmstrong/edgekit-agui', tarball: 'kevinmarmstrong-edgekit-agui-0.1.0.tgz' },
  { dir: 'packages/ui', name: '@kevinmarmstrong/edgekit-ui', tarball: 'kevinmarmstrong-edgekit-ui-0.1.0.tgz' },
  { dir: 'packages/react', name: '@kevinmarmstrong/edgekit-react', tarball: 'kevinmarmstrong-edgekit-react-0.1.0.tgz' },
  { dir: 'packages/cli', name: '@kevinmarmstrong/edgekit-cli', tarball: 'kevinmarmstrong-edgekit-cli-0.1.0.tgz' },
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
  manifest.dependencies[item.name] = `file:${resolve(packsDir, item.tarball)}`
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

await run('npm', ['install'], appDir)
await run('npm', ['run', 'typecheck'], appDir)
await run('npm', ['run', 'build'], appDir)

console.log(`Fresh app package smoke passed: ${appDir}`)

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
