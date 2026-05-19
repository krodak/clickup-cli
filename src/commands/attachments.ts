import { ClickUpClient } from '../api.js'
import type { TaskAttachment } from '../api.js'
import type { Config } from '../config.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

export function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1048576).toFixed(1)} MB`
}

interface AttachmentRow {
  title: string
  extension: string
  size: string
  date: string
  url: string
}

const ATTACHMENT_COLUMNS: Column<AttachmentRow>[] = [
  { key: 'title', label: 'Title', maxWidth: 40 },
  { key: 'extension', label: 'Ext', maxWidth: 10 },
  { key: 'size', label: 'Size', maxWidth: 10 },
  { key: 'date', label: 'Date', maxWidth: 12 },
  { key: 'url', label: 'URL', maxWidth: 60 },
]

function toRow(a: TaskAttachment): AttachmentRow {
  return {
    title: a.title,
    extension: a.extension,
    size: formatSize(a.size),
    date: new Date(a.date_created).toLocaleDateString(),
    url: a.url,
  }
}

export async function listTaskAttachments(
  config: Config,
  taskId: string,
): Promise<TaskAttachment[]> {
  const client = new ClickUpClient(config)
  return client.getTaskAttachments(taskId)
}

export function formatAttachmentsTable(attachments: TaskAttachment[]): string {
  if (attachments.length === 0) return 'No attachments found'
  const rows = attachments.map(toRow)
  return formatTable(rows, ATTACHMENT_COLUMNS)
}

export function formatAttachmentsMarkdown(attachments: TaskAttachment[]): string {
  if (attachments.length === 0) return 'No attachments found'
  return attachments
    .map(a => `- **${a.title}** (${a.extension}, ${formatSize(a.size)}) — ${a.url}`)
    .join('\n')
}
