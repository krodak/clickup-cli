import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function postComment(
  config: Config,
  taskId: string,
  text: string,
): Promise<{ id: string }> {
  if (!text.trim()) throw new Error('Comment text cannot be empty')
  const client = new ClickUpClient(config)
  return client.postComment(taskId, text)
}
