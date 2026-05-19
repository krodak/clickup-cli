import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { CommentSummary } from './comments.js'

export async function fetchViewComments(config: Config, viewId: string): Promise<CommentSummary[]> {
  const client = new ClickUpClient(config)
  const comments = await client.getViewComments(viewId)
  return comments.map(c => ({
    id: c.id,
    user: c.user.username,
    date: c.date,
    text: c.comment_text,
  }))
}

export async function postViewCommentCommand(
  config: Config,
  viewId: string,
  text: string,
  notifyAll?: boolean,
): Promise<{ id: string }> {
  if (!text.trim()) throw new Error('Comment text cannot be empty')
  const client = new ClickUpClient(config)
  return client.postViewComment(viewId, text, notifyAll)
}
