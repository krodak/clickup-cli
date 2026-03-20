import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import type { CommentSummary } from './comments.js'
import { formatTaskDetail } from '../interactive.js'
import { isTTY, shouldOutputJson } from '../output.js'
import { formatTaskDetailMarkdown, formatCommentsMarkdown } from '../markdown.js'
import { formatTimestamp } from '../date.js'

interface ActivityResult {
  task: Task
  comments: CommentSummary[]
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
  if (shouldOutputJson(forceJson)) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (!isTTY()) {
    const taskMd = formatTaskDetailMarkdown(result.task)
    const commentsMd = formatCommentsMarkdown(result.comments)
    console.log(`${taskMd}\n\n## Comments\n\n${commentsMd}`)
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
    console.log(`${chalk.bold(c.user)}  ${chalk.dim(formatTimestamp(c.date))}`)
    console.log(c.text)
  }
}
