import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TaskBundle } from './bundle.js'
import { renderCommentsMarkdown, renderTaskMarkdown } from './render.js'

export type Downloader = (url: string) => Promise<Buffer>

export interface WriteOptions {
  hasTask: (id: string) => boolean
  downloadAttachments: boolean
  download?: Downloader
}

export interface WriteResult {
  dir: string
  contentHash: string
  attachmentsDownloaded: number
  attachmentsFailed: Array<{ id: string; title: string; error: string }>
}

/**
 * `<id>-<sanitized title>`: the id prefix keeps two attachments with the same
 * name apart and makes re-runs idempotent; sanitizing removes path separators
 * and anything that is awkward across filesystems.
 */
export function safeAttachmentFilename(id: string, title: string): string {
  // ClickUp attachment ids look like "<uuid>.<ext>"; keep only the uuid so the
  // extension appears once, at the end.
  const idStem = id.replace(/\.[A-Za-z0-9]+$/, '')
  const base = title.split(/[\\/]/).pop() ?? title
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot + 1) : ''
  const clean = (s: string) =>
    s
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^[.-]+|[.-]+$/g, '')
      .slice(0, 120)
  const stemClean = clean(stem) || 'file'
  const extClean = clean(ext)
  return extClean ? `${idStem}-${stemClean}.${extClean}` : `${idStem}-${stemClean}`
}

async function defaultDownload(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return Buffer.from(await res.arrayBuffer())
}

export function taskDir(root: string, taskId: string): string {
  return join(root, 'tasks', taskId)
}

export interface DataWriteResult {
  dir: string
  contentHash: string
  attachmentsDownloaded: number
  attachmentsFailed: Array<{ id: string; title: string; error: string }>
}

/**
 * Phase one of writing a bundle: the lossless JSON files and attachment
 * binaries. Rendering markdown is separate so links can be resolved once the
 * whole run knows which tasks ended up in the archive.
 */
export async function writeBundleData(
  root: string,
  bundle: TaskBundle,
  opts: { downloadAttachments: boolean; download?: Downloader },
): Promise<DataWriteResult> {
  const dir = taskDir(root, bundle.task.id)
  await mkdir(dir, { recursive: true })
  const download = opts.download ?? defaultDownload

  const localPaths = new Map<string, string>()
  const failed: DataWriteResult['attachmentsFailed'] = []
  let downloaded = 0
  if (opts.downloadAttachments && bundle.attachments.length > 0) {
    const attDir = join(dir, 'attachments')
    await mkdir(attDir, { recursive: true })
    for (const att of bundle.attachments) {
      const file = safeAttachmentFilename(att.id, att.title)
      const target = join(attDir, file)
      if (existsSync(target)) {
        localPaths.set(att.id, `attachments/${file}`)
        continue
      }
      try {
        await writeFile(target, await download(att.url))
        localPaths.set(att.id, `attachments/${file}`)
        downloaded++
      } catch (err) {
        failed.push({ id: att.id, title: att.title, error: (err as Error).message })
      }
    }
  }

  const taskJson = JSON.stringify(bundle.task, null, 2) + '\n'
  const contentHash = createHash('sha256').update(taskJson).digest('hex')
  const meta = { fetchedAt: bundle.fetchedAt, subtaskIds: bundle.subtaskIds }

  await Promise.all([
    writeFile(join(dir, 'task.json'), taskJson),
    writeFile(join(dir, 'comments.json'), JSON.stringify(bundle.comments, null, 2) + '\n'),
    writeFile(
      join(dir, 'attachments.json'),
      JSON.stringify(
        bundle.attachments.map(a => ({ ...a, local: localPaths.get(a.id) ?? null })),
        null,
        2,
      ) + '\n',
    ),
    writeFile(join(dir, 'bundle.json'), JSON.stringify(meta, null, 2) + '\n'),
  ])

  return { dir, contentHash, attachmentsDownloaded: downloaded, attachmentsFailed: failed }
}

/** Reload a bundle from the JSON written by writeBundleData. */
export async function readBundleData(root: string, taskId: string): Promise<TaskBundle> {
  const dir = taskDir(root, taskId)
  const [task, comments, attachments, meta] = await Promise.all([
    readFile(join(dir, 'task.json'), 'utf8').then(s => JSON.parse(s) as TaskBundle['task']),
    readFile(join(dir, 'comments.json'), 'utf8').then(s => JSON.parse(s) as TaskBundle['comments']),
    readFile(join(dir, 'attachments.json'), 'utf8').then(
      s => JSON.parse(s) as Array<TaskBundle['attachments'][number] & { local: string | null }>,
    ),
    readFile(join(dir, 'bundle.json'), 'utf8').then(
      s => JSON.parse(s) as { fetchedAt: string; subtaskIds: string[] },
    ),
  ])
  return {
    task,
    comments,
    attachments: attachments.map(({ local: _local, ...a }) => a),
    subtaskIds: meta.subtaskIds,
    fetchedAt: meta.fetchedAt,
  }
}

/**
 * Phase two: task.md and comments.md. Attachment links come from
 * attachments.json (whatever was actually downloaded), task links from hasTask.
 */
export async function renderBundleMarkdown(
  root: string,
  bundle: TaskBundle,
  hasTask: (id: string) => boolean,
  spaceName?: (id: string) => string | undefined,
): Promise<void> {
  const dir = taskDir(root, bundle.task.id)
  const attachments = JSON.parse(await readFile(join(dir, 'attachments.json'), 'utf8')) as Array<{
    id: string
    local: string | null
  }>
  const localPaths = new Map(attachments.map(a => [a.id, a.local ?? undefined]))
  const ctx = {
    hasTask: (id: string) => hasTask(id),
    attachmentPath: (id: string) => localPaths.get(id),
    ...(spaceName ? { spaceName: (id: string) => spaceName(id) } : {}),
  }
  await Promise.all([
    writeFile(join(dir, 'task.md'), renderTaskMarkdown(bundle, ctx)),
    writeFile(join(dir, 'comments.md'), renderCommentsMarkdown(bundle)),
  ])
}

/** Write a bundle completely: data, then markdown. */
export async function writeTaskBundle(
  root: string,
  bundle: TaskBundle,
  opts: WriteOptions,
): Promise<WriteResult> {
  const result = await writeBundleData(root, bundle, opts)
  await renderBundleMarkdown(root, bundle, opts.hasTask)
  return result
}
