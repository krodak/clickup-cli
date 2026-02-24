import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'
import { groupedTaskPicker, showDetailsAndOpen } from '../interactive.js'
import type { TaskSummary } from './tasks.js'
import { summarize } from './tasks.js'

export type TimePeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'earlier_this_month'
  | 'last_month'
  | 'older'

interface TimePeriodDef {
  key: TimePeriod
  label: string
}

const TIME_PERIODS: TimePeriodDef[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7_days', label: 'Last 7 days' },
  { key: 'earlier_this_month', label: 'Earlier this month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'older', label: 'Older' },
]

export type GroupedInbox = Record<TimePeriod, InboxTaskSummary[]>

export interface InboxTaskSummary extends TaskSummary {
  date_updated: string
}

function summarizeWithDate(task: Task): InboxTaskSummary {
  return {
    ...summarize(task),
    date_updated: task.date_updated ?? '0',
  }
}

export function classifyTimePeriod(timestampMs: number, now: number): TimePeriod {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)

  const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1)

  if (timestampMs >= todayStart.getTime()) return 'today'
  if (timestampMs >= yesterdayStart.getTime()) return 'yesterday'
  if (timestampMs >= sevenDaysAgo.getTime()) return 'last_7_days'
  if (timestampMs >= thisMonthStart.getTime()) return 'earlier_this_month'
  if (timestampMs >= lastMonthStart.getTime()) return 'last_month'
  return 'older'
}

export function groupTasks(tasks: InboxTaskSummary[], now: number): GroupedInbox {
  const groups: GroupedInbox = {
    today: [],
    yesterday: [],
    last_7_days: [],
    earlier_this_month: [],
    last_month: [],
    older: [],
  }

  for (const task of tasks) {
    const period = classifyTimePeriod(Number(task.date_updated), now)
    groups[period].push(task)
  }

  return groups
}

export async function fetchInbox(config: Config, days: number = 30): Promise<InboxTaskSummary[]> {
  const client = new ClickUpClient(config)
  const tasks = await client.getMyTasks(config.teamId, { subtasks: true })

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return tasks
    .filter(t => Number(t.date_updated ?? 0) > cutoff)
    .sort((a, b) => Number(b.date_updated ?? 0) - Number(a.date_updated ?? 0))
    .map(summarizeWithDate)
}

export async function printInbox(
  tasks: InboxTaskSummary[],
  forceJson: boolean,
  config?: Config,
): Promise<void> {
  const now = Date.now()
  const groups = groupTasks(tasks, now)

  if (forceJson || !isTTY()) {
    const jsonGroups: Record<string, InboxTaskSummary[]> = {}
    for (const { key } of TIME_PERIODS) {
      if (groups[key].length > 0) {
        jsonGroups[key] = groups[key]
      }
    }
    console.log(JSON.stringify(jsonGroups, null, 2))
    return
  }

  if (tasks.length === 0) {
    console.log('No recently updated tasks.')
    return
  }

  const pickerGroups = TIME_PERIODS.filter(def => groups[def.key].length > 0).map(def => ({
    label: def.label,
    tasks: groups[def.key],
  }))

  const fetchTask = config
    ? (() => {
        const client = new ClickUpClient(config)
        return (id: string) => client.getTask(id)
      })()
    : undefined

  const selected = await groupedTaskPicker(pickerGroups)
  await showDetailsAndOpen(selected, fetchTask)
}
