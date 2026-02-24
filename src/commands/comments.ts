import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

export interface CommentSummary {
  id: string
  user: string
  date: string
  text: string
}

function formatDate(timestamp: string): string {
  return new Date(Number(timestamp)).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export async function fetchComments(config: Config, taskId: string): Promise<CommentSummary[]> {
  const client = new ClickUpClient(config)
  const comments = await client.getTaskComments(taskId)
  return comments.map(c => ({
    id: c.id,
    user: c.user.username,
    date: c.date,
    text: c.comment_text,
  }))
}

export function printComments(comments: CommentSummary[], forceJson: boolean): void {
  if (forceJson || !isTTY()) {
    console.log(JSON.stringify(comments, null, 2))
    return
  }

  if (comments.length === 0) {
    console.log('No comments found.')
    return
  }

  const separator = chalk.dim('-'.repeat(60))
  for (let i = 0; i < comments.length; i++) {
    const c = comments[i]!
    if (i > 0) console.log(separator)
    console.log(`${chalk.bold(c.user)}  ${chalk.dim(formatDate(c.date))}`)
    console.log(c.text)
    console.log('')
  }
}
