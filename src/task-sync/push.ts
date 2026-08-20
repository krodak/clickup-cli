import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { compileForTask, compilePlain, descriptionNeedsAssets } from '../cufm/publish.js'
import { classifyConflict, confirmClobber } from './conflict.js'
import { parseMarkdownFile, stringifyMarkdownFile } from './frontmatter.js'
import { inspectGit } from './git.js'
import { isPathRef } from './graph.js'
import { contentHash } from './hash.js'
import { loadMediaIndex, saveMediaIndex } from './media.js'

export interface PushOptions {
  force?: boolean
  dryRun?: boolean
  noInput?: boolean
  list?: string
  create?: boolean
  title?: string
  mermaidTheme?: string
  parentId?: string | null
}

export interface PushResult {
  action: 'skipped' | 'created' | 'updated' | 'dry-run'
  taskId: string
  url?: string
  warnings: string[]
}

export async function pushTaskFile(
  config: Config,
  filePath: string,
  opts: PushOptions = {},
): Promise<PushResult> {
  const abs = resolve(filePath)
  const source = await readFile(abs, 'utf8')
  const parsed = parseMarkdownFile(source)
  const client = new ClickUpClient(config)
  const hash = contentHash(parsed.body, [])
  const git = await inspectGit([abs])
  const localDirty = hash !== parsed.frontmatter.content_hash || git.dirty
  const parentId =
    opts.parentId !== undefined
      ? opts.parentId
      : await resolveFrontmatterParent(abs, parsed.frontmatter.parent)

  let created = false
  let taskId = parsed.frontmatter.clickup_id
  if (!taskId) {
    if (!opts.create && !opts.list && !parsed.frontmatter.list_id) {
      throw new Error('No clickup_id in frontmatter. Use --create --list <id> to create a task.')
    }
    const listId = opts.list ?? parsed.frontmatter.list_id
    if (!listId) throw new Error('Provide --list (or list_id in frontmatter) to create a task')
    const name = opts.title ?? parsed.frontmatter.title ?? 'Untitled'
    if (opts.dryRun) {
      return { action: 'dry-run', taskId: '(new)', warnings: [] }
    }
    const createdTask = await client.createTask(listId, {
      name,
      ...(parentId ? { parent: parentId } : {}),
    })
    created = true
    taskId = createdTask.id
    parsed.frontmatter.clickup_id = createdTask.id
    parsed.frontmatter.clickup_url = createdTask.url
    parsed.frontmatter.list_id = listId
    parsed.frontmatter.title = name
  }

  const remote = await client.getTask(taskId)
  const remoteNewer =
    parsed.frontmatter.last_remote_date_updated !== undefined &&
    remote.date_updated !== undefined &&
    Number(remote.date_updated) > Number(parsed.frontmatter.last_remote_date_updated)

  const parentChanged = parentId !== undefined && (remote.parent ?? null) !== parentId
  const unchanged =
    !localDirty &&
    !parentChanged &&
    (!git.available || git.head === parsed.frontmatter.last_sync_sha) &&
    remote.date_updated === parsed.frontmatter.last_remote_date_updated

  if (unchanged) {
    return { action: 'skipped', taskId, url: remote.url, warnings: [] }
  }

  const kind = classifyConflict({ localDirty, remoteNewer })
  if (kind === 'both' || kind === 'remote') {
    await confirmClobber(
      `Task ${taskId} was edited in ClickUp after last sync (remote date_updated=${remote.date_updated}). Push will overwrite the ClickUp description.`,
      opts,
    )
  }

  if (opts.dryRun) {
    return { action: 'dry-run', taskId, url: remote.url, warnings: [] }
  }

  const media = await loadMediaIndex(abs)
  const compiled = descriptionNeedsAssets(parsed.body)
    ? await compileForTask({
        markdown: parsed.body,
        client,
        taskId,
        baseDir: dirname(abs),
        media,
        mermaidTheme: opts.mermaidTheme,
      })
    : compilePlain(parsed.body)

  const name = opts.title ?? parsed.frontmatter.title
  await client.updateTask(taskId, {
    description: { ops: compiled.ops },
    ...(name && name !== remote.name ? { name } : {}),
    ...(parentChanged ? { parent: parentId } : {}),
  })
  const updated = await client.getTask(taskId)
  parsed.frontmatter.last_sync_at = new Date().toISOString()
  parsed.frontmatter.last_sync_sha = git.head
  parsed.frontmatter.last_remote_date_updated = updated.date_updated
  parsed.frontmatter.content_hash = hash
  parsed.frontmatter.clickup_url = updated.url
  await writeFile(abs, stringifyMarkdownFile(parsed.frontmatter, parsed.body))
  await saveMediaIndex(abs, media)
  return {
    action: created ? 'created' : 'updated',
    taskId,
    url: updated.url,
    warnings: compiled.warnings,
  }
}

async function resolveFrontmatterParent(
  fromFile: string,
  parent: string | null | undefined,
): Promise<string | null | undefined> {
  if (parent === null) return null
  if (!parent) return undefined
  if (!isPathRef(parent)) return parent
  try {
    const target = resolve(dirname(fromFile), parent)
    return parseMarkdownFile(await readFile(target, 'utf8')).frontmatter.clickup_id
  } catch {
    return undefined
  }
}
