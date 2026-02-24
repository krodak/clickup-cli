import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'
import { groupedTaskPicker, showDetailsAndOpen } from '../interactive.js'
import type { TaskSummary } from './tasks.js'
import { summarize } from './tasks.js'

const CLOSED_STATUSES = new Set(['done', 'closed', 'complete', 'completed'])

const STATUS_ORDER = [
  'code review',
  'in review',
  'review',
  'in progress',
  'to do',
  'open',
  'needs definition',
  'backlog',
  'blocked',
] as const

interface AssignedTaskJson {
  id: string
  name: string
  status: string
  task_type: 'task' | 'initiative'
  list: string
  url: string
  priority: string | null
  due_date: string | null
}

function toJsonTask(task: Task, summary: TaskSummary): AssignedTaskJson {
  return {
    id: summary.id,
    name: summary.name,
    status: summary.status,
    task_type: summary.task_type,
    list: summary.list,
    url: summary.url,
    priority: task.priority?.priority ?? null,
    due_date: task.due_date ?? null,
  }
}

interface GroupedTasks {
  status: string
  tasks: Task[]
}

function statusSortKey(status: string): number {
  const idx = (STATUS_ORDER as readonly string[]).indexOf(status.toLowerCase())
  return idx === -1 ? STATUS_ORDER.length : idx
}

function groupByStatus(tasks: Task[], includeClosed: boolean): GroupedTasks[] {
  const groups = new Map<string, Task[]>()

  for (const task of tasks) {
    const status = task.status.status
    const key = status.toLowerCase()

    if (!includeClosed && CLOSED_STATUSES.has(key)) continue

    if (!groups.has(status)) {
      groups.set(status, [])
    }
    groups.get(status)!.push(task)
  }

  return Array.from(groups.entries())
    .sort((a, b) => {
      const aIsClosed = CLOSED_STATUSES.has(a[0].toLowerCase())
      const bIsClosed = CLOSED_STATUSES.has(b[0].toLowerCase())
      if (aIsClosed !== bIsClosed) return aIsClosed ? 1 : -1
      return statusSortKey(a[0]) - statusSortKey(b[0])
    })
    .map(([status, tasks]) => ({ status, tasks }))
}

export async function runAssignedCommand(
  config: Config,
  opts: { includeClosed?: boolean; json?: boolean },
): Promise<void> {
  const client = new ClickUpClient(config)
  const allTasks = await client.getMyTasks(config.teamId)
  const groups = groupByStatus(allTasks, opts.includeClosed ?? false)

  if (opts.json || !isTTY()) {
    const result: Record<string, AssignedTaskJson[]> = {}
    for (const group of groups) {
      result[group.status.toLowerCase()] = group.tasks.map(t => toJsonTask(t, summarize(t)))
    }
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (groups.length === 0) {
    console.log('No tasks found.')
    return
  }

  const pickerGroups = groups.map(g => ({
    label: g.status.toUpperCase(),
    tasks: g.tasks.map(summarize),
  }))
  const selected = await groupedTaskPicker(pickerGroups)
  await showDetailsAndOpen(selected, (id: string) => client.getTask(id))
}

export { groupByStatus, CLOSED_STATUSES }
export type { GroupedTasks, AssignedTaskJson }
