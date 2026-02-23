import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function updateDescription(config: Config, taskId: string, description: string): Promise<{ id: string; name: string }> {
  const client = new ClickUpClient(config)
  const task = await client.updateTaskDescription(taskId, description)
  return { id: task.id, name: task.name }
}
