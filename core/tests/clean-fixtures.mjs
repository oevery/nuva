import { readdir, rm } from 'node:fs/promises'
import process from 'node:process'

async function main() {
  const fixturesDir = new URL('./fixtures/', import.meta.url)
  const entries = await readdir(fixturesDir, { withFileTypes: true })

  await Promise.all(entries
    .filter(entry => entry.isDirectory())
    .flatMap(entry => [
      rm(new URL(`${entry.name}/.nuxt`, fixturesDir), { recursive: true, force: true }),
      rm(new URL(`${entry.name}/.output`, fixturesDir), { recursive: true, force: true }),
      rm(new URL(`${entry.name}/node_modules/.cache`, fixturesDir), { recursive: true, force: true }),
    ]))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
