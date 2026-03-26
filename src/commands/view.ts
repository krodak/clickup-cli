import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { View } from '../api.js'
import type { Config } from '../config.js'
import { formatDate } from '../date.js'

export async function getView(config: Config, viewId: string): Promise<View> {
  const client = new ClickUpClient(config)
  return client.getView(viewId)
}

export function formatView(view: View): string {
  const lines: string[] = []
  lines.push(chalk.bold.underline(view.name))
  lines.push('')
  lines.push(`  ${chalk.bold('ID')}     ${view.id}`)
  lines.push(`  ${chalk.bold('Type')}   ${view.type}`)
  if (view.visibility) lines.push(`  ${chalk.bold('Visibility')} ${view.visibility}`)
  if (view.date_created) lines.push(`  ${chalk.bold('Created')} ${formatDate(view.date_created)}`)
  if (view.protected !== undefined) lines.push(`  ${chalk.bold('Protected')} ${view.protected}`)
  return lines.join('\n')
}

export function formatViewMarkdown(view: View): string {
  const lines: string[] = []
  lines.push(`# ${view.name}`)
  lines.push('')
  lines.push(`- **ID:** ${view.id}`)
  lines.push(`- **Type:** ${view.type}`)
  if (view.visibility) lines.push(`- **Visibility:** ${view.visibility}`)
  if (view.date_created) lines.push(`- **Created:** ${formatDate(view.date_created)}`)
  if (view.protected !== undefined) lines.push(`- **Protected:** ${view.protected}`)
  return lines.join('\n')
}
