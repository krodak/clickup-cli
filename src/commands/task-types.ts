import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { CustomTaskType } from '../api.js'

export async function listTaskTypes(config: Config): Promise<CustomTaskType[]> {
  const client = new ClickUpClient(config)
  return client.getCustomTaskTypes(config.teamId)
}

export function formatTaskTypes(types: CustomTaskType[]): string {
  if (types.length === 0) return 'No custom task types'
  return types.map(t => `${chalk.bold(t.name)} ${chalk.dim(`(${t.id})`)}`).join('\n')
}

export function formatTaskTypesMarkdown(types: CustomTaskType[]): string {
  if (types.length === 0) return 'No custom task types'
  return types.map(t => `- **${t.name}** (${t.id})`).join('\n')
}
