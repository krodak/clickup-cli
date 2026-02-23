import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const ROOT = dirname(fileURLToPath(import.meta.url))

export async function setup(): Promise<void> {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })
}
