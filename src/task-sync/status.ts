import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { parseMarkdownFile } from './frontmatter.js'
import { inspectGit } from './git.js'
import { contentHash } from './hash.js'

export interface StatusResult {
  file: string
  taskId?: string
  localDirty: boolean
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
  const hash = contentHash(parsed.body, [])
  const git = await inspectGit([abs])
  const localDirty = hash !== parsed.frontmatter.content_hash || git.dirty
  let remoteDateUpdated: string | undefined
  if (parsed.frontmatter.clickup_id) {
    const client = new ClickUpClient(config)
    const task = await client.getTask(parsed.frontmatter.clickup_id)
    remoteDateUpdated = task.date_updated
  }
  const lastRemote = parsed.frontmatter.last_remote_date_updated
  const remoteNewer =
    remoteDateUpdated !== undefined &&
    lastRemote !== undefined &&
    Number(remoteDateUpdated) > Number(lastRemote)
  return {
    file: abs,
    taskId: parsed.frontmatter.clickup_id,
    localDirty,
    gitHead: git.head,
    lastSyncSha: parsed.frontmatter.last_sync_sha,
    remoteDateUpdated,
    lastRemoteDateUpdated: lastRemote,
    remoteNewer,
  }
}
