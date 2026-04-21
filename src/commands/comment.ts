import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { markdownToCommentBlocks } from './comment-format.js'

export async function postComment(
  config: Config,
  taskId: string,
  text: string,
  notifyAll?: boolean,
): Promise<{ id: string }> {
  if (!text.trim()) throw new Error('Comment text cannot be empty')
  const client = new ClickUpClient(config)
  const blocks = markdownToCommentBlocks(text)
  return client.postComment(taskId, text, notifyAll, blocks)
}
