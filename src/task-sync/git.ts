import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface GitState {
  available: boolean
  head: string | null
  dirty: boolean
}

export async function inspectGit(paths: string[]): Promise<GitState> {
  try {
    const inside = await git(['rev-parse', '--is-inside-work-tree'])
    if (inside.trim() !== 'true') return { available: false, head: null, dirty: false }
    const head = (await git(['rev-parse', 'HEAD'])).trim()
    const porcelain = paths.length > 0 ? await git(['status', '--porcelain', '--', ...paths]) : ''
    return { available: true, head, dirty: porcelain.trim().length > 0 }
  } catch {
    return { available: false, head: null, dirty: false }
  }
}

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { timeout: 5000 })
  return stdout
}
