import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { summarize, isDoneStatus, buildTypeMap } from './tasks.js'
import type { TaskSummary } from './tasks.js'

function isOverdue(task: Task, now: number): boolean {
  if (!task.due_date) return false
  return Number(task.due_date) < now
}

export async function fetchOverdueTasks(
  config: Config,
  opts: { includeClosed?: boolean } = {},
): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const [allTasks, customTypes] = await Promise.all([
    client.getMyTasks(config.teamId, { includeClosed: opts.includeClosed }),
    client.getCustomTaskTypes(config.teamId),
  ])
  const typeMap = buildTypeMap(customTypes)
  const now = Date.now()

  return allTasks
    .filter(t => isOverdue(t, now) && (opts.includeClosed || !isDoneStatus(t.status.status)))
    .sort((a, b) => Number(a.due_date) - Number(b.due_date))
    .map(t => summarize(t, typeMap))
}
