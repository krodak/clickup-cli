import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { ListTemplate } from '../api.js'

export async function listListTemplates(config: Config): Promise<ListTemplate[]> {
  const client = new ClickUpClient(config)
  return client.getListTemplates(config.teamId)
}

export function formatListTemplates(templates: ListTemplate[]): string {
  if (templates.length === 0) return 'No list templates'
  return templates.map(t => `${chalk.bold(t.name)} ${chalk.dim(`(${t.id})`)}`).join('\n')
}

export function formatListTemplatesMarkdown(templates: ListTemplate[]): string {
  if (templates.length === 0) return 'No list templates'
  return templates.map(t => `- **${t.name}** (${t.id})`).join('\n')
}
