import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface CreateOptions {
  list?: string
  name: string
  description?: string
  parent?: string
  status?: string
}

export async function createTask(
  config: Config,
  options: CreateOptions,
): Promise<{ id: string; name: string; url: string }> {
  const client = new ClickUpClient(config)

  let listId = options.list
  if (!listId && options.parent) {
    const parentTask = await client.getTask(options.parent)
    listId = parentTask.list.id
  }
  if (!listId) {
    throw new Error('Provide --list or --parent (list is auto-detected from parent task)')
  }

  const { list: _, ...taskOptions } = options
  const task = await client.createTask(listId, taskOptions)
  return { id: task.id, name: task.name, url: task.url }
}
