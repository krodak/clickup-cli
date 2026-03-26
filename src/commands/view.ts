import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { View } from '../api.js'

export async function getView(config: Config, viewId: string): Promise<View> {
  const client = new ClickUpClient(config)
  return client.getView(viewId)
}

export function formatView(view: View): string {
  const lines: string[] = []
  lines.push(`${chalk.bold(view.name)} ${chalk.dim(`(${view.id})`)}`)
  lines.push(`Type: ${chalk.cyan(view.type)}`)
  if (view.visibility) lines.push(`Visibility: ${view.visibility}`)
  if (view.protected) lines.push(`Protected: yes`)
  if (view.public) lines.push(`Public: yes`)
  if (view.public_url) lines.push(`URL: ${view.public_url}`)
  if (view.grouping) lines.push(`Grouping: ${JSON.stringify(view.grouping)}`)
  if (view.sorting) lines.push(`Sorting: ${JSON.stringify(view.sorting)}`)
  if (view.filters) lines.push(`Filters: ${JSON.stringify(view.filters)}`)
  if (view.columns) lines.push(`Columns: ${JSON.stringify(view.columns)}`)
  if (view.settings) lines.push(`Settings: ${JSON.stringify(view.settings)}`)
  return lines.join('\n')
}

export function formatViewMarkdown(view: View): string {
  const lines: string[] = []
  lines.push(`## ${view.name}`)
  lines.push('')
  lines.push(`- **ID:** ${view.id}`)
  lines.push(`- **Type:** ${view.type}`)
  if (view.visibility) lines.push(`- **Visibility:** ${view.visibility}`)
  if (view.protected) lines.push(`- **Protected:** yes`)
  if (view.public) lines.push(`- **Public:** yes`)
  if (view.public_url) lines.push(`- **URL:** ${view.public_url}`)
  if (view.grouping) lines.push(`\n### Grouping\n\n\`\`\`json\n${JSON.stringify(view.grouping, null, 2)}\n\`\`\``)
  if (view.sorting) lines.push(`\n### Sorting\n\n\`\`\`json\n${JSON.stringify(view.sorting, null, 2)}\n\`\`\``)
  if (view.filters) lines.push(`\n### Filters\n\n\`\`\`json\n${JSON.stringify(view.filters, null, 2)}\n\`\`\``)
  if (view.columns) lines.push(`\n### Columns\n\n\`\`\`json\n${JSON.stringify(view.columns, null, 2)}\n\`\`\``)
  if (view.settings) lines.push(`\n### Settings\n\n\`\`\`json\n${JSON.stringify(view.settings, null, 2)}\n\`\`\``)
  return lines.join('\n')
}
