import chalk from 'chalk'
import type { TaskSummary } from './commands/tasks.js'

export interface Column<T> {
  key: keyof T & string
  label: string
  maxWidth?: number
  format?: (value: string, row: T) => string
}

export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY)
}

export function shouldOutputJson(forceJson: boolean): boolean {
  if (forceJson) return true
  if (process.env['CU_OUTPUT'] === 'json') return true
  return false
}

function cell(value: string, width: number): string {
  if (value.length > width) return value.slice(0, width - 1) + '…'
  return value.padEnd(width)
}

function computeWidths<T>(rows: T[], columns: Column<T>[]): number[] {
  return columns.map(col => {
    const headerLen = col.label.length
    const maxDataLen = rows.reduce((max, row) => {
      const val = String(row[col.key] ?? '')
      return Math.max(max, val.length)
    }, 0)
    const natural = Math.max(headerLen, maxDataLen)
    return col.maxWidth ? Math.min(natural, col.maxWidth) : natural
  })
}

export function formatTable<T>(rows: T[], columns: Column<T>[]): string {
  const widths = computeWidths(rows, columns)
  const header = columns.map((c, i) => cell(c.label, widths[i]!)).join('  ')
  const divider = chalk.dim('-'.repeat(header.replace(/\x1b\[[0-9;]*m/g, '').length))
  const lines = [chalk.bold(header), divider]
  for (const row of rows) {
    lines.push(
      columns
        .map((c, i) => {
          const raw = String(row[c.key] ?? '')
          const width = widths[i]!
          const truncated = raw.length > width ? raw.slice(0, width - 1) + '\u2026' : raw
          const padding = ' '.repeat(Math.max(0, width - truncated.length))
          return c.format ? c.format(truncated, row) + padding : truncated + padding
        })
        .join('  '),
    )
  }
  return lines.join('\n')
}

export function colorStatus(status: string): string {
  const lower = status.toLowerCase()
  if (lower.includes('done') || lower.includes('complete') || lower.includes('closed'))
    return chalk.green(status)
  if (lower.includes('progress') || lower.includes('review') || lower.includes('active'))
    return chalk.yellow(status)
  if (lower.includes('block') || lower.includes('stuck')) return chalk.red(status)
  return chalk.dim(status)
}

export function colorPriority(priority: string): string {
  const lower = priority.toLowerCase()
  if (lower === 'urgent') return chalk.red(priority)
  if (lower === 'high') return chalk.yellow(priority)
  if (lower === 'normal') return priority
  if (lower === 'low') return chalk.dim(priority)
  return priority
}

export function colorDueDate(dateStr: string, rawTimestamp?: string | number | null): string {
  if (!dateStr) return dateStr
  if (rawTimestamp) {
    const ts = Number(rawTimestamp)
    if (Number.isFinite(ts) && ts < Date.now()) return chalk.red(dateStr)
  }
  return dateStr
}

export const TASK_COLUMNS: Column<TaskSummary>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'NAME', maxWidth: 60 },
  { key: 'status', label: 'STATUS', maxWidth: 20, format: v => colorStatus(v) },
  { key: 'priority', label: 'PRIORITY', maxWidth: 10, format: v => colorPriority(v) },
  {
    key: 'due_date',
    label: 'DUE',
    maxWidth: 15,
    format: (v, row) => (v ? colorDueDate(v, row.dueRaw) : ''),
  },
  { key: 'list', label: 'LIST' },
]
