import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function deleteComment(config: Config, commentId: string): Promise<void> {
  const client = new ClickUpClient(config)
  await client.deleteComment(commentId)
}
