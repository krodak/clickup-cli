import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { isTTY, shouldOutputJson } from '../output.js'
import { formatGroupedTasksMarkdown } from '../markdown.js'
import { groupedTaskPicker, showDetailsAndOpen } from '../interactive.js'
import type { TaskSummary } from './tasks.js'
import { summarize, isDoneStatus } from './tasks.js'

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

type AssignedTaskJson = TaskSummary

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
    if (!includeClosed && isDoneStatus(status)) continue

    if (!groups.has(status)) {
      groups.set(status, [])
    }
    groups.get(status)!.push(task)
  }

  return Array.from(groups.entries())
    .sort((a, b) => {
      const aIsClosed = isDoneStatus(a[0])
      const bIsClosed = isDoneStatus(b[0])
      if (aIsClosed !== bIsClosed) return aIsClosed ? 1 : -1
      return statusSortKey(a[0]) - statusSortKey(b[0])
    })
    .map(([status, tasks]) => ({ status, tasks }))
}

export async function runAssignedCommand(
  config: Config,
  opts: { status?: string; includeClosed?: boolean; json?: boolean },
): Promise<void> {
  const client = new ClickUpClient(config)
  const allTasks = await client.getMyTasks(config.teamId, {
    includeClosed: opts.includeClosed,
  })
  let groups = groupByStatus(allTasks, opts.includeClosed ?? false)

  if (opts.status) {
    const lower = opts.status.toLowerCase()
    groups = groups.filter(g => g.status.toLowerCase() === lower)
  }

  if (shouldOutputJson(opts.json ?? false)) {
    const result: Record<string, AssignedTaskJson[]> = {}
    for (const group of groups) {
      result[group.status.toLowerCase()] = group.tasks.map(summarize)
    }
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (!isTTY()) {
    const mdGroups = groups.map(g => ({
      label: g.status,
      tasks: g.tasks.map(t => summarize(t)),
    }))
    console.log(formatGroupedTasksMarkdown(mdGroups))
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

export { groupByStatus }
export type { GroupedTasks, AssignedTaskJson }
