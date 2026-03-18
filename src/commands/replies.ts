import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Comment } from '../api.js'
import type { Config } from '../config.js'

export async function getReplies(config: Config, commentId: string): Promise<Comment[]> {
  const client = new ClickUpClient(config)
  return client.getThreadedComments(commentId)
}

export async function createReply(config: Config, commentId: string, text: string): Promise<void> {
  if (!text.trim()) throw new Error('Reply text cannot be empty')
  const client = new ClickUpClient(config)
  await client.createThreadedComment(commentId, text)
}

export function formatReplies(replies: Comment[]): string {
  if (replies.length === 0) return 'No replies'
  return replies
    .map(r => {
      const user = r.user?.username ?? 'Unknown'
      const date = new Date(Number(r.date)).toLocaleString()
      return `${chalk.bold(user)} ${chalk.dim(date)}\n  ${r.comment_text}`
    })
    .join('\n\n')
}
