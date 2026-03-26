import { ClickUpClient } from '../api.js'
import type { View } from '../api.js'
import type { Config } from '../config.js'

const VALID_VIEW_TYPES = ['list', 'board', 'calendar', 'gantt', 'table', 'timeline'] as const
type ViewType = (typeof VALID_VIEW_TYPES)[number]

const VALID_GROUP_BY_FIELDS = [
  'status',
  'assignee',
  'priority',
  'due_date',
  'tag',
  'sprint',
] as const

interface ViewCreateOptions {
  type: string
  groupBy?: string
}

export async function createView(
  config: Config,
  listId: string,
  name: string,
  opts: ViewCreateOptions,
): Promise<View> {
  if (!name.trim()) throw new Error('View name cannot be empty')

  if (!VALID_VIEW_TYPES.includes(opts.type as ViewType)) {
    throw new Error(`Invalid view type "${opts.type}". Valid types: ${VALID_VIEW_TYPES.join(', ')}`)
  }

  const payload: { name: string; type: string; grouping?: { field: string } } = {
    name,
    type: opts.type,
  }

  if (opts.groupBy) {
    if (!VALID_GROUP_BY_FIELDS.includes(opts.groupBy as (typeof VALID_GROUP_BY_FIELDS)[number])) {
      throw new Error(
        `Invalid group-by field "${opts.groupBy}". Valid fields: ${VALID_GROUP_BY_FIELDS.join(', ')}`,
      )
    }
    payload.grouping = { field: opts.groupBy }
  }

  const client = new ClickUpClient(config)
  return client.createListView(listId, payload)
}
