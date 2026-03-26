import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { View } from '../api.js'

export interface ViewSummary {
  id: string
  name: string
  type: string
}

export async function listViews(config: Config, listId: string): Promise<ViewSummary[]> {
  const client = new ClickUpClient(config)
  const data = await client.getListViews(listId)
  const all: View[] = [...data.views]
  for (const view of Object.values(data.required_views)) {
    if (view) all.push(view)
  }
  return all.map(v => ({ id: v.id, name: v.name, type: v.type }))
}

export function formatViews(views: ViewSummary[]): string {
  if (views.length === 0) return 'No views found'
  return views
    .map(v => `${chalk.bold(v.name)} ${chalk.dim(`(${v.id})`)} ${chalk.cyan(v.type)}`)
    .join('\n')
}

export function formatViewsMarkdown(views: ViewSummary[]): string {
  if (views.length === 0) return 'No views found'
  return views.map(v => `- **${v.name}** (${v.id}) — ${v.type}`).join('\n')
}
