import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { View } from '../api.js'

export interface ViewCreateOptions {
  type: string
  groupBy?: string
}

const VALID_VIEW_TYPES = [
  'list',
  'board',
  'calendar',
  'table',
  'timeline',
  'workload',
  'activity',
  'map',
  'chat',
  'gantt',
]

export async function createView(
  config: Config,
  listId: string,
  name: string,
  options: ViewCreateOptions,
): Promise<View> {
  if (!name.trim()) throw new Error('View name cannot be empty')
  if (!VALID_VIEW_TYPES.includes(options.type)) {
    throw new Error(
      `Invalid view type "${options.type}". Valid types: ${VALID_VIEW_TYPES.join(', ')}`,
    )
  }

  const payload: Record<string, unknown> = {
    name,
    type: options.type,
  }

  if (options.groupBy) {
    payload.grouping = { field: options.groupBy, dir: 1, collapsed: [], ignore: false }
  }

  const client = new ClickUpClient(config)
  return client.createListView(listId, payload as { name: string; type: string })
}
