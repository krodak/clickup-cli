import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { View } from '../api.js'

export interface ViewUpdateOptions {
  name?: string
  groupBy?: string
}

export async function updateViewCommand(
  config: Config,
  viewId: string,
  options: ViewUpdateOptions,
): Promise<View> {
  if (!options.name && !options.groupBy) {
    throw new Error('Provide at least one option to update (--name, --group-by)')
  }

  const payload: Record<string, unknown> = {}
  if (options.name) payload.name = options.name
  if (options.groupBy) {
    payload.grouping = { field: options.groupBy, dir: 1, collapsed: [], ignore: false }
  }

  const client = new ClickUpClient(config)
  return client.updateView(viewId, payload)
}
