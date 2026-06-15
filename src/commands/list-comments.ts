import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { buildCommentBlocks } from './comment.js'
import type { CommentSummary } from './comments.js'

export async function fetchListComments(config: Config, listId: string): Promise<CommentSummary[]> {
  const client = new ClickUpClient(config)
  const comments = await client.getListComments(listId)
  return comments.map(c => ({
    id: c.id,
    user: c.user.username,
    date: c.date,
    text: c.comment_text,
  }))
}

export async function postListCommentCommand(
  config: Config,
  listId: string,
  text: string,
  notifyAll?: boolean,
  mentionIds?: number[],
): Promise<{ id: string }> {
  if (!text.trim()) throw new Error('Comment text cannot be empty')
  const client = new ClickUpClient(config)
  const blocks = buildCommentBlocks(text, mentionIds ?? [])
  return client.postListComment(listId, text, notifyAll, blocks)
}
