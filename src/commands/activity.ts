import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import type { CommentSummary } from './comments.js'
import { formatTaskDetail } from '../interactive.js'
import { isTTY } from '../output.js'

export interface ActivityResult {
  task: Task
  comments: CommentSummary[]
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

export async function fetchActivity(config: Config, taskId: string): Promise<ActivityResult> {
  const client = new ClickUpClient(config)
  const [task, rawComments] = await Promise.all([
    client.getTask(taskId),
    client.getTaskComments(taskId),
  ])
  const comments: CommentSummary[] = rawComments.map(c => ({
    id: c.id,
    user: c.user.username,
    date: c.date,
    text: c.comment_text,
  }))
  return { task, comments }
}

export function printActivity(result: ActivityResult, forceJson: boolean): void {
  if (forceJson || !isTTY()) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(formatTaskDetail(result.task))

  console.log('')
  console.log(chalk.bold('Comments'))
  console.log(chalk.dim('-'.repeat(60)))

  if (result.comments.length === 0) {
    console.log('No comments.')
    return
  }

  for (let i = 0; i < result.comments.length; i++) {
    const c = result.comments[i]!
    if (i > 0) {
      console.log('')
      console.log(chalk.dim('-'.repeat(60)))
    }
    console.log(`${chalk.bold(c.user)}  ${chalk.dim(formatDate(c.date))}`)
    console.log(c.text)
  }
}
