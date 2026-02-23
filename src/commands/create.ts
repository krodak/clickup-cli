import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface CreateOptions {
  list: string
  name: string
  description?: string
  parent?: string
  status?: string
}

export async function createTask(config: Config, options: CreateOptions): Promise<{ id: string; name: string; url: string }> {
  const client = new ClickUpClient(config)
  const { list, ...taskOptions } = options
  const task = await client.createTask(list, taskOptions)
  return { id: task.id, name: task.name, url: task.url }
}
