import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Webhook } from '../api.js'
import { isTTY } from '../output.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface WebhookRow {
  id: string
  endpoint: string
  events: string
  status: string
  scope: string
}

const WEBHOOK_COLUMNS: Column<WebhookRow>[] = [
  { key: 'id', label: 'ID' },
  { key: 'endpoint', label: 'Endpoint', maxWidth: 45 },
  { key: 'events', label: 'Events', maxWidth: 30 },
  {
    key: 'status',
    label: 'Status',
    maxWidth: 10,
    format: v => (v === 'active' ? chalk.green(v) : chalk.dim(v)),
  },
  { key: 'scope', label: 'Scope', maxWidth: 15 },
]

function webhookScope(w: Webhook): string {
  if (w.task_id) return `task:${w.task_id}`
  if (w.list_id) return `list:${w.list_id}`
  if (w.folder_id) return `folder:${w.folder_id}`
  if (w.space_id) return `space:${w.space_id}`
  return 'workspace'
}

export async function fetchWebhooks(config: Config): Promise<Webhook[]> {
  const client = new ClickUpClient(config)
  return client.getWebhooks()
}

export async function createWebhookCommand(
  config: Config,
  opts: {
    url: string
    events: string
    space?: string
    folder?: string
    list?: string
    task?: string
  },
): Promise<Webhook> {
  const client = new ClickUpClient(config)
  const events = opts.events.split(',').map(e => e.trim())
  const scopeOpts: { spaceId?: string; folderId?: string; listId?: string; taskId?: string } = {}
  if (opts.space) scopeOpts.spaceId = opts.space
  if (opts.folder) scopeOpts.folderId = opts.folder
  if (opts.list) scopeOpts.listId = opts.list
  if (opts.task) scopeOpts.taskId = opts.task
  return client.createWebhook(opts.url, events, scopeOpts)
}

export async function updateWebhookCommand(
  config: Config,
  webhookId: string,
  opts: { url?: string; events?: string; status?: string },
): Promise<Webhook> {
  const client = new ClickUpClient(config)
  const payload: { endpoint?: string; events?: string[]; status?: string } = {}
  if (opts.url) payload.endpoint = opts.url
  if (opts.events) payload.events = opts.events.split(',').map(e => e.trim())
  if (opts.status) payload.status = opts.status
  return client.updateWebhook(webhookId, payload)
}

export async function deleteWebhookCommand(
  config: Config,
  webhookId: string,
  opts: { confirm?: boolean },
): Promise<{ webhookId: string; deleted: boolean }> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
    }
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `Delete webhook ${webhookId}? This cannot be undone.`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.deleteWebhook(webhookId)
  return { webhookId, deleted: true }
}

export function formatWebhooks(webhooks: Webhook[]): string {
  if (webhooks.length === 0) return 'No webhooks found.'

  const rows: WebhookRow[] = webhooks.map(w => ({
    id: w.id,
    endpoint: w.endpoint,
    events: w.events.join(', '),
    status: w.status,
    scope: webhookScope(w),
  }))

  return formatTable(rows, WEBHOOK_COLUMNS)
}

export function formatWebhooksMarkdown(webhooks: Webhook[]): string {
  if (webhooks.length === 0) return 'No webhooks found.'

  const lines: string[] = []
  for (const w of webhooks) {
    lines.push(`## ${w.id}`)
    lines.push('')
    lines.push(`- **Endpoint:** ${w.endpoint}`)
    lines.push(`- **Events:** ${w.events.join(', ')}`)
    lines.push(`- **Status:** ${w.status}`)
    lines.push(`- **Scope:** ${webhookScope(w)}`)
    lines.push('')
  }

  return lines.join('\n')
}
