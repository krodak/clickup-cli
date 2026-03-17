import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function editComment(
  config: Config,
  commentId: string,
  text: string,
  resolved?: boolean,
): Promise<void> {
  if (!text.trim()) throw new Error('Comment text cannot be empty')
  const client = new ClickUpClient(config)
  await client.updateComment(commentId, text, resolved)
}
