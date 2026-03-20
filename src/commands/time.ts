import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { TimeEntry } from '../api.js'
import { parseTimeEstimate } from './update.js'
import { formatDuration, formatTimestamp } from '../date.js'

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

export function formatTimeEntry(entry: TimeEntry): string {
  const lines: string[] = []
  const taskName = entry.task?.name ?? 'No task'
  const taskId = entry.task?.id ?? ''
  const isRunning = entry.duration < 0
  const elapsed = isRunning ? Date.now() - Number(entry.start) : entry.duration
  const durationStr = formatDuration(elapsed)
  const status = isRunning ? chalk.green('RUNNING') : ''

  lines.push(`${chalk.bold(taskName)} ${chalk.dim(taskId)} ${status}`)
  lines.push(
    `  ${durationStr} - ${formatTimestamp(entry.start)}${entry.description ? ` - ${entry.description}` : ''}`,
  )
  return lines.join('\n')
}

export function formatTimeEntries(entries: TimeEntry[]): string {
  if (entries.length === 0) return 'No time entries'
  return entries.map(formatTimeEntry).join('\n')
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
