import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface FieldDescriptor {
  id: string
  name: string
  type: string
  type_config?: {
    options?: ReadonlyArray<{
      id: string
      name: string
      orderindex?: number
    }>
  }
}

interface FieldOptions {
  set?: [string, string]
  remove?: string
}

interface FieldResult {
  taskId: string
  field: string
  action: 'set' | 'removed'
  value?: unknown
}

interface FieldResults {
  results: FieldResult[]
}

const SUPPORTED_TYPES = new Set([
  'text',
  'short_text',
  'number',
  'currency',
  'phone',
  'drop_down',
  'labels',
  'checkbox',
  'date',
  'url',
  'email',
  'emoji',
  'manual_progress',
  'tasks',
  'users',
])

export function findFieldByName<T extends FieldDescriptor>(fields: readonly T[], name: string): T {
  const lower = name.toLowerCase()
  const match = fields.find(f => f.name.toLowerCase() === lower)
  if (!match) {
    const available = fields.map(f => f.name).join(', ')
    throw new Error(`Field "${name}" not found. Available fields: ${available}`)
  }
  return match
}

export function parseFieldValue(field: FieldDescriptor, rawValue: string): unknown {
  if (!SUPPORTED_TYPES.has(field.type)) {
    throw new Error(
      `Field type "${field.type}" is not supported. Supported types: ${[...SUPPORTED_TYPES].join(', ')}`,
    )
  }

  switch (field.type) {
    case 'number': {
      const n = Number(rawValue)
      if (!Number.isFinite(n)) throw new Error(`Value "${rawValue}" is not a valid numeric value`)
      return n
    }
    case 'checkbox':
      if (rawValue !== 'true' && rawValue !== 'false') {
        throw new Error('Checkbox value must be "true" or "false"')
      }
      return rawValue === 'true'
    case 'drop_down': {
      const options = field.type_config?.options
      if (!options?.length) throw new Error('Dropdown field has no configured options')
      const lower = rawValue.toLowerCase()
      const option = options.find(o => o.name.toLowerCase() === lower)
      if (!option) {
        const available = options.map(o => o.name).join(', ')
        throw new Error(`Option "${rawValue}" not found. Available options: ${available}`)
      }
      if (option.orderindex === undefined) {
        throw new Error(`Dropdown option "${option.name}" has no orderindex`)
      }
      return option.orderindex
    }
    case 'labels': {
      const options = field.type_config?.options
      if (!options?.length) throw new Error('Labels field has no configured options')
      const names = rawValue
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      if (names.length === 0) throw new Error('Provide at least one label name (comma-separated)')
      const ids: string[] = []
      for (const name of names) {
        const lower = name.toLowerCase()
        const option = options.find(o => o.name.toLowerCase() === lower)
        if (!option) {
          const available = options.map(o => o.name).join(', ')
          throw new Error(`Label "${name}" not found. Available: ${available}`)
        }
        ids.push(option.id)
      }
      return ids
    }
    case 'date': {
      const ms = new Date(rawValue).getTime()
      if (!Number.isFinite(ms))
        throw new Error(`Value "${rawValue}" is not a valid date (use YYYY-MM-DD)`)
      return ms
    }
    case 'emoji': {
      const n = Number(rawValue)
      if (!Number.isFinite(n) || n < 0 || n > 5) {
        throw new Error('Rating value must be a number between 0 and 5')
      }
      return n
    }
    case 'manual_progress': {
      const n = Number(rawValue)
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new Error('Progress value must be a number between 0 and 100')
      }
      return { current: n }
    }
    case 'tasks': {
      const ids = rawValue
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      if (ids.length === 0) throw new Error('Provide at least one task ID (comma-separated)')
      return { add: ids }
    }
    case 'users': {
      const ids = rawValue
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      if (ids.length === 0) throw new Error('Provide at least one user ID (comma-separated)')
      return { add: ids.map(Number) }
    }
    default:
      return rawValue
  }
}

export async function setCustomField(
  config: Config,
  taskId: string,
  opts: FieldOptions,
): Promise<FieldResults> {
  if (!opts.set && !opts.remove) {
    throw new Error('Provide at least one of: --set, --remove')
  }

  const client = new ClickUpClient(config)
  const task = await client.getTask(taskId)
  const fields = task.custom_fields ?? []
  const results: FieldResult[] = []

  if (opts.set) {
    const [fieldName, rawValue] = opts.set
    const field = findFieldByName(fields, fieldName)
    const parsed = parseFieldValue(field, rawValue)
    await client.setCustomFieldValue(taskId, field.id, parsed)
    results.push({ taskId, field: field.name, action: 'set', value: parsed })
  }

  if (opts.remove) {
    const field = findFieldByName(fields, opts.remove)
    await client.removeCustomFieldValue(taskId, field.id)
    results.push({ taskId, field: field.name, action: 'removed' })
  }

  return { results }
}
