import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
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
  return extClean ? `${id}-${stemClean}.${extClean}` : `${id}-${stemClean}`
}

async function defaultDownload(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return Buffer.from(await res.arrayBuffer())
}

export function taskDir(root: string, taskId: string): string {
  return join(root, 'tasks', taskId)
}

export async function writeTaskBundle(
  root: string,
  bundle: TaskBundle,
  opts: WriteOptions,
): Promise<WriteResult> {
  const dir = taskDir(root, bundle.task.id)
  await mkdir(dir, { recursive: true })
  const download = opts.download ?? defaultDownload

  const localPaths = new Map<string, string>()
  const failed: WriteResult['attachmentsFailed'] = []
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
  const { hasTask } = opts
  const ctx = {
    hasTask: (id: string) => hasTask(id),
    attachmentPath: (id: string) => localPaths.get(id),
  }

  await Promise.all([
    writeFile(join(dir, 'task.json'), taskJson),
    writeFile(join(dir, 'task.md'), renderTaskMarkdown(bundle, ctx)),
    writeFile(join(dir, 'comments.json'), JSON.stringify(bundle.comments, null, 2) + '\n'),
    writeFile(join(dir, 'comments.md'), renderCommentsMarkdown(bundle)),
    writeFile(
      join(dir, 'attachments.json'),
      JSON.stringify(
        bundle.attachments.map(a => ({ ...a, local: localPaths.get(a.id) ?? null })),
        null,
        2,
      ) + '\n',
    ),
  ])

  return { dir, contentHash, attachmentsDownloaded: downloaded, attachmentsFailed: failed }
}
