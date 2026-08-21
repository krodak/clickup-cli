import { isTTY } from '../output.js'

import { remoteDescriptionHash } from './hash.js'
import type { TaskSyncFrontmatter } from './frontmatter.js'

export type ConflictKind = 'none' | 'local' | 'remote' | 'both'

/**
 * True when the remote task changed since the last sync in a way a push would
 * clobber. `date_updated` bumps on any task change (status, assignee,
 * comments), so when the last sync recorded a description fingerprint we also
 * require that fingerprint to differ.
 */
export function isRemoteNewer(
  frontmatter: Pick<TaskSyncFrontmatter, 'last_remote_date_updated' | 'last_remote_hash'>,
  remote: { date_updated?: string; description?: string },
): boolean {
  const last = frontmatter.last_remote_date_updated
  if (last === undefined || remote.date_updated === undefined) return false
  if (Number(remote.date_updated) <= Number(last)) return false
  if (frontmatter.last_remote_hash === undefined) return true
  return remoteDescriptionHash(remote) !== frontmatter.last_remote_hash
}

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
  overrideFlag = '--force',
): Promise<void> {
  if (opts.force) return
  if (opts.noInput || !isTTY()) {
    throw new Error(`${message} Re-run with ${overrideFlag} to override.`)
  }
  const { confirm } = await import('@inquirer/prompts')
  const ok = await confirm({ message, default: false })
  if (!ok) throw new Error('Cancelled')
}
