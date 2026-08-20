import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isRemoteNewer } from './conflict.js'
import { parseMarkdownFile } from './frontmatter.js'
import { inspectGit } from './git.js'
import { contentHash, localAssetHashes } from './hash.js'

export interface StatusResult {
  file: string
  taskId?: string
  /** Body or referenced local assets differ from the last synced content_hash. */
  localDirty: boolean
  /** File has uncommitted git changes (informational; does not block sync). */
  gitDirty: boolean
  gitHead?: string | null
  lastSyncSha?: string | null
  remoteDateUpdated?: string
  lastRemoteDateUpdated?: string
  remoteNewer: boolean
}

export async function taskSyncStatus(config: Config, filePath: string): Promise<StatusResult> {
  const abs = resolve(filePath)
  const source = await readFile(abs, 'utf8')
  const parsed = parseMarkdownFile(source)
  const hash = contentHash(parsed.body, await localAssetHashes(parsed.body, dirname(abs)))
  const git = await inspectGit([abs])
  const localDirty = hash !== parsed.frontmatter.content_hash
  let remoteDateUpdated: string | undefined
  let remoteNewer = false
  if (parsed.frontmatter.clickup_id) {
    const client = new ClickUpClient(config)
    const task = await client.getTask(parsed.frontmatter.clickup_id)
    remoteDateUpdated = task.date_updated
    remoteNewer = isRemoteNewer(parsed.frontmatter, task)
  }
  const lastRemote = parsed.frontmatter.last_remote_date_updated
  return {
    file: abs,
    taskId: parsed.frontmatter.clickup_id,
    localDirty,
    gitDirty: git.dirty,
    gitHead: git.head,
    lastSyncSha: parsed.frontmatter.last_sync_sha,
    remoteDateUpdated,
    lastRemoteDateUpdated: lastRemote,
    remoteNewer,
  }
}
