import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { runInBatches } from '../util/batch.js'

const FIELD_CREATE_CONCURRENCY = 5

export const VALID_FIELD_TYPES = [
  'text',
  'short_text',
  'number',
  'date',
  'checkbox',
  'drop_down',
  'labels',
  'email',
  'phone',
  'url',
  'currency',
]

export type FieldScope =
  { mode: 'workspace' } | { mode: 'single'; listId: string } | { mode: 'bulk'; listIds: string[] }

export type ListFieldOutcome = {
  listId: string
  ok: boolean
  fieldId?: string
  error?: string
}

export type FieldCreateOpts = {
  description?: string
  required?: boolean
  options?: string[]
}

export function resolveFieldScope(list?: string, lists?: string): FieldScope {
  if (list && lists) throw new Error('Cannot use --list and --lists together')
  if (list) return { mode: 'single', listId: list }
  if (lists) {
    const listIds = lists
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
    if (listIds.length === 0) throw new Error('--lists requires at least one list ID')
    return { mode: 'bulk', listIds }
  }
  return { mode: 'workspace' }
}

export function validateFieldType(type: string, options?: string[]): void {
  if (!VALID_FIELD_TYPES.includes(type)) {
    throw new Error(`Invalid field type "${type}". Valid types: ${VALID_FIELD_TYPES.join(', ')}`)
  }
  if ((type === 'drop_down' || type === 'labels') && !options?.length) {
    throw new Error(`--options is required for ${type} fields (comma-separated values)`)
  }
}

export async function createFieldAcrossLists(
  config: Config,
  name: string,
  type: string,
  listIds: string[],
  opts?: FieldCreateOpts,
): Promise<ListFieldOutcome[]> {
  const client = new ClickUpClient(config)
  const outcomes = await runInBatches(listIds, FIELD_CREATE_CONCURRENCY, listId =>
    client.createListCustomField(listId, name, type, opts),
  )
  return outcomes.map(outcome =>
    outcome.ok
      ? { listId: outcome.item, ok: true, fieldId: outcome.result.id }
      : { listId: outcome.item, ok: false, error: outcome.error.message },
  )
}
