import { execFile } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface GitState {
  available: boolean
  head: string | null
  dirty: boolean
}

export async function inspectGit(paths: string[]): Promise<GitState> {
  // Run git from the target file's directory so a file in a different repo (or
  // a non-repo cwd) is inspected against its own repository, not process.cwd().
  const cwd = paths[0] ? dirname(resolve(paths[0])) : process.cwd()
  try {
    const inside = await git(['rev-parse', '--is-inside-work-tree'], cwd)
    if (inside.trim() !== 'true') return { available: false, head: null, dirty: false }
    const head = (await git(['rev-parse', 'HEAD'], cwd)).trim()
    const porcelain =
      paths.length > 0 ? await git(['status', '--porcelain', '--', ...paths], cwd) : ''
    return { available: true, head, dirty: porcelain.trim().length > 0 }
  } catch {
    return { available: false, head: null, dirty: false }
  }
}

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { timeout: 5000, cwd })
  return stdout
}
