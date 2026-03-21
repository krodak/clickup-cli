import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { CustomFieldDefinition } from '../api.js'

export async function listFields(config: Config, listId: string): Promise<CustomFieldDefinition[]> {
  const client = new ClickUpClient(config)
  return client.getListCustomFields(listId)
}

export function formatFields(fields: CustomFieldDefinition[]): string {
  if (fields.length === 0) return 'No custom fields'
  return fields
    .map(f => {
      const options = f.type_config?.options?.map(o => o.name).join(', ')
      const optStr = options ? ` ${chalk.dim(`[${options}]`)}` : ''
      return `${chalk.bold(f.name)} ${chalk.dim(f.type)}${f.required ? chalk.yellow(' (required)') : ''}${optStr}`
    })
    .join('\n')
}

export function formatFieldsMarkdown(fields: CustomFieldDefinition[]): string {
  if (fields.length === 0) return 'No custom fields'
  return fields
    .map(f => {
      const options = f.type_config?.options?.map(o => o.name).join(', ')
      const optStr = options ? ` [${options}]` : ''
      return `- **${f.name}** (${f.type})${f.required ? ' - required' : ''}${optStr}`
    })
    .join('\n')
}
