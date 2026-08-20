import { isTTY } from '../output.js'

export type ConflictKind = 'none' | 'local' | 'remote' | 'both'

export function classifyConflict(opts: {
  localDirty: boolean
  remoteNewer: boolean
}): ConflictKind {
  if (opts.localDirty && opts.remoteNewer) return 'both'
  if (opts.localDirty) return 'local'
  if (opts.remoteNewer) return 'remote'
  return 'none'
}

export async function confirmClobber(
  message: string,
  opts: { force?: boolean; noInput?: boolean },
): Promise<void> {
  if (opts.force) return
  if (opts.noInput || !isTTY()) {
    throw new Error(`${message} Re-run with --force to override.`)
  }
  const { confirm } = await import('@inquirer/prompts')
  const ok = await confirm({ message, default: false })
  if (!ok) throw new Error('Cancelled')
}
