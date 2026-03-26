import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { ViewSummary } from '../api.js'
import type { Config } from '../config.js'

export async function listViews(config: Config, listId: string): Promise<ViewSummary[]> {
  const client = new ClickUpClient(config)
  const data = await client.getListViews(listId)
  return data.views
}

export function formatViews(views: ViewSummary[]): string {
  if (views.length === 0) return 'No views'
  return views
    .map(v => `${chalk.bold(v.name)} ${chalk.dim(`(${v.id})`)} ${chalk.dim(v.type)}`)
    .join('\n')
}

export function formatViewsMarkdown(views: ViewSummary[]): string {
  if (views.length === 0) return 'No views'
  return views.map(v => `- **${v.name}** (${v.id}) - ${v.type}`).join('\n')
}
