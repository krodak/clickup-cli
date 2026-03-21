import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { TaskTemplate } from '../api.js'

export async function listTemplates(config: Config): Promise<TaskTemplate[]> {
  const client = new ClickUpClient(config)
  return client.getTaskTemplates(config.teamId)
}

export function formatTemplates(templates: TaskTemplate[]): string {
  if (templates.length === 0) return 'No task templates'
  return templates.map(t => `${chalk.bold(t.name)} ${chalk.dim(`(${t.id})`)}`).join('\n')
}

export function formatTemplatesMarkdown(templates: TaskTemplate[]): string {
  if (templates.length === 0) return 'No task templates'
  return templates.map(t => `- **${t.name}** (${t.id})`).join('\n')
}
