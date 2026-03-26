import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { FolderTemplate } from '../api.js'

export async function listFolderTemplates(config: Config): Promise<FolderTemplate[]> {
  const client = new ClickUpClient(config)
  return client.getFolderTemplates(config.teamId)
}

export function formatFolderTemplates(templates: FolderTemplate[]): string {
  if (templates.length === 0) return 'No folder templates'
  return templates.map(t => `${chalk.bold(t.name)} ${chalk.dim(`(${t.id})`)}`).join('\n')
}

export function formatFolderTemplatesMarkdown(templates: FolderTemplate[]): string {
  if (templates.length === 0) return 'No folder templates'
  return templates.map(t => `- **${t.name}** (${t.id})`).join('\n')
}
