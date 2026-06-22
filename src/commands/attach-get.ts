import { ClickUpClient } from '../api.js'
import type { TaskAttachment } from '../api.js'
import type { Config } from '../config.js'

export interface AttachGetOptions {
  output?: string
  dir?: string
  all?: boolean
  force?: boolean
}

export interface DownloadResult {
  title: string
  path: string
  size: number
}

export function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, '_').replace(/^\.+/, '')
  return base.length > 0 ? base : 'attachment'
}

export function selectAttachments(
  attachments: TaskAttachment[],
  selector: string | undefined,
  all: boolean,
): TaskAttachment[] {
  if (all) return attachments
  if (attachments.length === 0) {
    throw new Error('No attachments found on this task')
  }
  if (!selector) {
    if (attachments.length === 1) return [attachments[0]!]
    const list = attachments.map(a => `  ${a.id}  ${a.title}`).join('\n')
    throw new Error(
      `Task has ${attachments.length} attachments. Specify one by ID or title, or use --all:\n${list}`,
    )
  }
  const lower = selector.toLowerCase()
  const byId = attachments.find(a => a.id === selector)
  if (byId) return [byId]
  const byExactTitle = attachments.find(a => a.title.toLowerCase() === lower)
  if (byExactTitle) return [byExactTitle]
  const byPartial = attachments.filter(a => a.title.toLowerCase().includes(lower))
  if (byPartial.length === 1) return [byPartial[0]!]
  if (byPartial.length > 1) {
    const list = byPartial.map(a => `  ${a.id}  ${a.title}`).join('\n')
    throw new Error(`Multiple attachments match "${selector}":\n${list}`)
  }
  const available = attachments.map(a => `  ${a.id}  ${a.title}`).join('\n')
  throw new Error(`No attachment matching "${selector}". Available:\n${available}`)
}

async function fileExists(path: string): Promise<boolean> {
  const { access } = await import('node:fs/promises')
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function downloadAttachment(
  attachment: TaskAttachment,
  targetPath: string,
  force: boolean,
): Promise<DownloadResult> {
  const { writeFile } = await import('node:fs/promises')
  if (!force && (await fileExists(targetPath))) {
    throw new Error(`File already exists: ${targetPath} (use --force to overwrite)`)
  }
  const res = await fetch(attachment.url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) {
    throw new Error(
      `Failed to download "${attachment.title}": HTTP ${res.status} ${res.statusText}`,
    )
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  await writeFile(targetPath, buffer)
  return { title: attachment.title, path: targetPath, size: buffer.length }
}

export async function attachGet(
  config: Config,
  taskId: string,
  selector: string | undefined,
  opts: AttachGetOptions,
): Promise<DownloadResult[]> {
  const { resolve } = await import('node:path')
  const client = new ClickUpClient(config)
  const attachments = await client.getTaskAttachments(taskId)
  const selected = selectAttachments(attachments, selector, opts.all ?? false)

  const results: DownloadResult[] = []
  for (const att of selected) {
    let targetPath: string
    if (opts.output && !opts.all) {
      targetPath = resolve(opts.output)
    } else {
      const dir = opts.dir ?? '.'
      targetPath = resolve(dir, sanitizeFilename(att.title))
    }
    results.push(await downloadAttachment(att, targetPath, opts.force ?? false))
  }
  return results
}
