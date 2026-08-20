import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { ClickUpClient, type Task } from '../api.js'
import type { Config } from '../config.js'
import { decompileCufm } from '../cufm/decompile.js'
import { classifyConflict, confirmClobber } from './conflict.js'
import { parseMarkdownFile, writeMarkdownFileAtomic } from './frontmatter.js'
import { fetchTaskOps } from './frontdoor.js'
import { inspectGit } from './git.js'
import { contentHash, localAssetHashes, remoteDescriptionHash, sha1Buffer } from './hash.js'
import { cupFilename, loadMediaIndex, saveMediaIndex } from './media.js'
import type { MediaIndex } from './media.js'

export interface PullOptions {
  force?: boolean
  dryRun?: boolean
  noInput?: boolean
  sessionToken?: string
  /** Already-fetched task (avoids a second GET when the caller has it). */
  task?: Task
}

export interface PullResult {
  action: 'written' | 'dry-run'
  taskId: string
  file: string
  lossless: boolean
}

export async function pullTaskToFile(
  config: Config,
  taskId: string,
  filePath: string,
  opts: PullOptions = {},
): Promise<PullResult> {
  const abs = resolve(filePath)
  const client = new ClickUpClient(config)
  const task = opts.task?.id === taskId ? opts.task : await client.getTask(taskId)

  try {
    const current = await readFile(abs, 'utf8')
    const parsed = parseMarkdownFile(current)
    const hash = contentHash(parsed.body, await localAssetHashes(parsed.body, dirname(abs)))
    const localDirty = hash !== parsed.frontmatter.content_hash
    const kind = classifyConflict({ localDirty, remoteNewer: true })
    if (kind === 'local' || kind === 'both') {
      await confirmClobber(
        `Local file ${abs} has unsynced local changes. Pull will overwrite it.`,
        opts,
      )
    }
  } catch {
    /* new file */
  }

  if (opts.dryRun) {
    return { action: 'dry-run', taskId: task.id, file: abs, lossless: false }
  }

  const doc = await fetchTaskOps(config, task.id, opts.sessionToken)
  let body = doc
    ? decompileCufm(doc.ops, { syncBlocks: doc.syncBlocks })
    : (task.markdown_description ?? task.description ?? '').replace(/\n*$/, '\n')

  const media = await loadMediaIndex(abs)
  const stem = basename(abs).replace(/\.md$/i, '')
  const assetsDir = join(dirname(abs), `${stem}.assets`)
  body = await localizeImages(body, assetsDir, media)

  const git = await inspectGit([abs])
  const deps = dependencyIds(task)
  const frontmatter = {
    clickup_id: task.id,
    clickup_url: task.url,
    title: task.name,
    list_id: task.list.id,
    ...(task.parent ? { parent: task.parent } : {}),
    ...(deps.dependsOn.length > 0 ? { depends_on: deps.dependsOn } : {}),
    ...(deps.blocks.length > 0 ? { blocks: deps.blocks } : {}),
    last_sync_at: new Date().toISOString(),
    last_sync_sha: git.head,
    last_remote_date_updated: task.date_updated,
    last_remote_hash: remoteDescriptionHash(task),
    content_hash: contentHash(body, await localAssetHashes(body, dirname(abs))),
  }
  await mkdir(dirname(abs), { recursive: true })
  await saveMediaIndex(abs, media)
  await writeMarkdownFileAtomic(abs, frontmatter, body)
  return { action: 'written', taskId: task.id, file: abs, lossless: doc !== undefined }
}

async function localizeImages(body: string, assetsDir: string, media: MediaIndex): Promise<string> {
  const re = /!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g
  let out = body
  const matches = [...body.matchAll(re)]
  for (const m of matches) {
    const url = m[1]!
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      const sha = sha1Buffer(buf)
      const ext = url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] ?? 'png'
      const name = cupFilename(sha, ext)
      await mkdir(assetsDir, { recursive: true })
      const dest = join(assetsDir, name)
      await writeFile(dest, buf)
      media[sha] = { local: dest, uploaded_name: name, url }
      const rel = `${basename(assetsDir)}/${name}`
      out = out.replaceAll(url, rel)
    } catch {
      /* keep remote url */
    }
  }
  return out
}

export function dependencyIds(task: Task): { dependsOn: string[]; blocks: string[] } {
  const dependsOn: string[] = []
  const blocks: string[] = []
  for (const dep of task.dependencies ?? []) {
    if (dep.depends_on === task.id) blocks.push(dep.task_id)
    else if (dep.task_id === task.id) dependsOn.push(dep.depends_on)
  }
  return { dependsOn: uniqueStrings(dependsOn), blocks: uniqueStrings(blocks) }
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items)]
}
