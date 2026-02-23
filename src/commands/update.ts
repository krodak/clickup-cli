import { ClickUpClient } from '../api.js'
import type { UpdateTaskOptions } from '../api.js'
import type { Config } from '../config.js'

export type { UpdateTaskOptions }

export async function updateTask(
  config: Config,
  taskId: string,
  options: UpdateTaskOptions
): Promise<{ id: string; name: string }> {
  const hasAny = Object.values(options).some(v => v !== undefined && String(v).trim() !== '')
  if (!hasAny) throw new Error('Provide at least one of: --name, --description, --status')

  const client = new ClickUpClient(config)
  const task = await client.updateTask(taskId, options)
  return { id: task.id, name: task.name }
}

export async function updateDescription(
  config: Config,
  taskId: string,
  description: string
): Promise<{ id: string; name: string }> {
  return updateTask(config, taskId, { description })
}
