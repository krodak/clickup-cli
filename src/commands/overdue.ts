import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { summarize, isDoneStatus } from './tasks.js'
import type { TaskSummary } from './tasks.js'

function isOverdue(task: Task, now: number): boolean {
  if (!task.due_date) return false
  return Number(task.due_date) < now
}

export async function fetchOverdueTasks(config: Config): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const allTasks = await client.getMyTasks(config.teamId)
  const now = Date.now()

  return allTasks
    .filter(t => isOverdue(t, now) && !isDoneStatus(t.status.status))
    .sort((a, b) => Number(a.due_date) - Number(b.due_date))
    .map(summarize)
}
