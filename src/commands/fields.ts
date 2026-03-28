import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { CustomFieldDefinition } from '../api.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface FieldRow {
  id: string
  name: string
  type: string
  required: string
  options: string
}

const FIELD_COLUMNS: Column<FieldRow>[] = [
  { key: 'id', label: 'ID', maxWidth: 20 },
  { key: 'name', label: 'Name', maxWidth: 30 },
  { key: 'type', label: 'Type', maxWidth: 15 },
  {
    key: 'required',
    label: 'Required',
    maxWidth: 10,
    format: v => (v === 'yes' ? chalk.yellow(v) : chalk.dim(v)),
  },
  { key: 'options', label: 'Options', maxWidth: 40 },
]

export async function listFields(config: Config, listId: string): Promise<CustomFieldDefinition[]> {
  const client = new ClickUpClient(config)
  return client.getListCustomFields(listId)
}

export function formatFields(fields: CustomFieldDefinition[]): string {
  if (fields.length === 0) return 'No custom fields'
  const rows: FieldRow[] = fields.map(f => ({
    id: f.id,
    name: f.name,
    type: f.type,
    required: f.required ? 'yes' : 'no',
    options: f.type_config?.options?.map(o => o.name).join(', ') ?? '',
  }))
  return formatTable(rows, FIELD_COLUMNS)
}

export function formatFieldsMarkdown(fields: CustomFieldDefinition[]): string {
  if (fields.length === 0) return 'No custom fields'
  return fields
    .map(f => {
      const options = f.type_config?.options?.map(o => o.name).join(', ')
      const optStr = options ? ` [${options}]` : ''
      return `- **${f.name}** \`${f.id}\` (${f.type})${f.required ? ' - required' : ''}${optStr}`
    })
    .join('\n')
}
