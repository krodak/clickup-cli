import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { isTTY, formatTable, TASK_COLUMNS } from '../output.js'
import { summarize, isDoneStatus } from './tasks.js'
import type { TaskSummary } from './tasks.js'

export interface SummaryResult {
  completed: TaskSummary[]
  inProgress: TaskSummary[]
  overdue: TaskSummary[]
}

const IN_PROGRESS_PATTERNS = ['in progress', 'in review', 'code review', 'doing']

function isCompletedRecently(task: Task, cutoff: number): boolean {
  if (!isDoneStatus(task.status.status)) return false
  const updated = Number(task.date_updated)
  return !isNaN(updated) && updated >= cutoff
}

function isInProgress(task: Task): boolean {
  const status = task.status.status.toLowerCase()
  return IN_PROGRESS_PATTERNS.some(p => status.includes(p))
}

function isOverdue(task: Task, now: number): boolean {
  if (!task.due_date) return false
  const due = Number(task.due_date)
  return !isNaN(due) && due < now
}

export function categorizeTasks(tasks: Task[], hoursBack: number): SummaryResult {
  const now = Date.now()
  const cutoff = now - hoursBack * 60 * 60 * 1000

  const completed: TaskSummary[] = []
  const inProgress: TaskSummary[] = []
  const overdue: TaskSummary[] = []

  for (const task of tasks) {
    const done = isDoneStatus(task.status.status)

    if (done && isCompletedRecently(task, cutoff)) {
      completed.push(summarize(task))
    }

    if (!done && isInProgress(task)) {
      inProgress.push(summarize(task))
    }

    if (!done && isOverdue(task, now)) {
      overdue.push(summarize(task))
    }
  }

  return { completed, inProgress, overdue }
}

function printSection(label: string, tasks: TaskSummary[]): void {
  console.log(`\n${label} (${tasks.length})`)
  if (tasks.length === 0) {
    console.log('  None')
  } else {
    console.log(formatTable(tasks, TASK_COLUMNS))
  }
}

export async function runSummaryCommand(
  config: Config,
  opts: { hours: number; json: boolean },
): Promise<void> {
  const client = new ClickUpClient(config)
  const allTasks = await client.getMyTasks(config.teamId)
  const result = categorizeTasks(allTasks, opts.hours)

  if (opts.json || !isTTY()) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  printSection('Completed Recently', result.completed)
  printSection('In Progress', result.inProgress)
  printSection('Overdue', result.overdue)
}
