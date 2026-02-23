import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'

export async function getTask(config: Config, taskId: string): Promise<Task> {
  const client = new ClickUpClient(config)
  return client.getTask(taskId)
}
