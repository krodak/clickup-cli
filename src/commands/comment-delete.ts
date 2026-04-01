import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function deleteComment(config: Config, commentId: string): Promise<void> {
  const client = new ClickUpClient(config)
  await client.deleteComment(commentId)
}

interface DeleteCommentSelectionOptions {
  mine?: boolean
  match?: string
}

function matchesCommentText(commentText: string, match: string | undefined): boolean {
  if (!match) return true
  return commentText.toLowerCase().includes(match.toLowerCase())
}

export async function deleteCommentByTaskSelection(
  config: Config,
  taskId: string,
  options: DeleteCommentSelectionOptions,
): Promise<{ commentId: string; taskId: string }> {
  if (!options.mine) {
    throw new Error('Task-scoped comment deletion requires --mine')
  }

  const client = new ClickUpClient(config)
  const me = await client.getMe()
  const comments = await client.getTaskComments(taskId)
  const matches = comments.filter(comment => {
    const authorId = 'id' in comment.user ? comment.user.id : undefined
    return authorId === me.id && matchesCommentText(comment.comment_text, options.match)
  })

  if (matches.length === 0) {
    throw new Error('No matching comments found for the current user')
  }

  if (matches.length > 1) {
    throw new Error('Multiple matching comments found - refine with --match or use a comment ID')
  }

  const comment = matches[0]!
  await client.deleteComment(comment.id)
  return { commentId: comment.id, taskId }
}
