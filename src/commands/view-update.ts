import { ClickUpClient } from '../api.js'
import type { View } from '../api.js'
import type { Config } from '../config.js'

const VALID_GROUP_BY_FIELDS = new Set<string>([
  'status',
  'assignee',
  'priority',
  'due_date',
  'tag',
  'sprint',
])

interface ViewUpdateOptions {
  name?: string
  groupBy?: string
}

export async function updateView(
  config: Config,
  viewId: string,
  opts: ViewUpdateOptions,
): Promise<View> {
  if (opts.name === undefined && opts.groupBy === undefined) {
    throw new Error('Provide at least one of: --name, --group-by')
  }
  if (opts.name !== undefined && !opts.name.trim()) {
    throw new Error('View name cannot be empty')
  }

  const payload: Record<string, unknown> = {}
  if (opts.name) payload.name = opts.name
  if (opts.groupBy) {
    if (!VALID_GROUP_BY_FIELDS.has(opts.groupBy)) {
      throw new Error(
        `Invalid group-by field "${opts.groupBy}". Valid fields: ${[...VALID_GROUP_BY_FIELDS].join(', ')}`,
      )
    }
    payload.grouping = { field: opts.groupBy }
  }

  const client = new ClickUpClient(config)
  return client.updateView(viewId, payload)
}
