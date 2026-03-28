import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { TimeEntry } from '../api.js'
import { parseTimeEstimate } from './update.js'
import { formatDuration, formatTimestamp } from '../date.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface TimeRow {
  task: string
  duration: string
  date: string
  description: string
  status: string
}

const TIME_COLUMNS: Column<TimeRow>[] = [
  { key: 'task', label: 'Task', maxWidth: 35 },
  { key: 'duration', label: 'Duration', maxWidth: 10 },
  { key: 'date', label: 'Date', maxWidth: 20 },
  { key: 'description', label: 'Description', maxWidth: 30 },
  { key: 'status', label: '', maxWidth: 10, format: v => (v === 'RUNNING' ? chalk.green(v) : '') },
]

export async function startTimer(
  config: Config,
  taskId: string,
  description?: string,
): Promise<TimeEntry> {
  const client = new ClickUpClient(config)
  return client.startTimeEntry(config.teamId, taskId, description)
}

export async function stopTimer(config: Config): Promise<TimeEntry> {
  const client = new ClickUpClient(config)
  return client.stopTimeEntry(config.teamId)
}

export async function timerStatus(config: Config): Promise<TimeEntry | null> {
  const client = new ClickUpClient(config)
  return client.getRunningTimeEntry(config.teamId)
}

export async function logTime(
  config: Config,
  taskId: string,
  durationStr: string,
  description?: string,
): Promise<TimeEntry> {
  const client = new ClickUpClient(config)
  const duration = parseTimeEstimate(durationStr)
  return client.createTimeEntry(config.teamId, taskId, duration, { description })
}

export async function listTimeEntries(
  config: Config,
  opts?: { days?: number; taskId?: string },
): Promise<TimeEntry[]> {
  const client = new ClickUpClient(config)
  const days = opts?.days ?? 7
  const endDate = Date.now()
  const startDate = endDate - days * 24 * 60 * 60 * 1000
  return client.getTimeEntries(config.teamId, {
    startDate,
    endDate,
    taskId: opts?.taskId,
  })
}

export async function updateTimeEntry(
  config: Config,
  timeEntryId: string,
  opts: { description?: string; duration?: string },
): Promise<TimeEntry> {
  if (!opts.description && !opts.duration) {
    throw new Error('Provide --description or --duration to update')
  }
  const client = new ClickUpClient(config)
  const updates: { description?: string; duration?: number } = {}
  if (opts.description) updates.description = opts.description
  if (opts.duration) updates.duration = parseTimeEstimate(opts.duration)
  return client.updateTimeEntry(config.teamId, timeEntryId, updates)
}

export async function deleteTimeEntry(config: Config, timeEntryId: string): Promise<void> {
  const client = new ClickUpClient(config)
  await client.deleteTimeEntry(config.teamId, timeEntryId)
}

export function formatTimeEntry(entry: TimeEntry): string {
  const taskName = entry.task?.name ?? 'No task'
  const isRunning = entry.duration < 0
  const elapsed = isRunning ? Date.now() - Number(entry.start) : entry.duration
  const row: TimeRow = {
    task: taskName,
    duration: formatDuration(elapsed),
    date: formatTimestamp(entry.start),
    description: entry.description ?? '',
    status: isRunning ? 'RUNNING' : '',
  }
  return formatTable([row], TIME_COLUMNS)
}

export function formatTimeEntries(entries: TimeEntry[]): string {
  if (entries.length === 0) return 'No time entries'
  const rows: TimeRow[] = entries.map(entry => {
    const taskName = entry.task?.name ?? 'No task'
    const isRunning = entry.duration < 0
    const elapsed = isRunning ? Date.now() - Number(entry.start) : entry.duration
    return {
      task: taskName,
      duration: formatDuration(elapsed),
      date: formatTimestamp(entry.start),
      description: entry.description ?? '',
      status: isRunning ? 'RUNNING' : '',
    }
  })
  return formatTable(rows, TIME_COLUMNS)
}

export function formatTimeEntryMarkdown(entry: TimeEntry): string {
  const taskName = entry.task?.name ?? 'No task'
  const taskId = entry.task?.id ?? ''
  const isRunning = entry.duration < 0
  const elapsed = isRunning ? Date.now() - Number(entry.start) : entry.duration
  const durationStr = formatDuration(elapsed)
  const status = isRunning ? ' (RUNNING)' : ''
  return `**${taskName}** ${taskId}${status} - ${durationStr}${entry.description ? ` - ${entry.description}` : ''}`
}

export function formatTimeEntriesMarkdown(entries: TimeEntry[]): string {
  if (entries.length === 0) return 'No time entries'
  return entries.map(formatTimeEntryMarkdown).join('\n')
}
