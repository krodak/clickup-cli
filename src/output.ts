import chalk from 'chalk'
import type { TaskSummary } from './commands/tasks.js'

export interface Column<T> {
  key: keyof T & string
  label: string
  maxWidth?: number
}

export function isTTY(): boolean {
  if ('NO_COLOR' in process.env) return false
  return Boolean(process.stdout.isTTY)
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
  const divider = '-'.repeat(header.replace(/\x1b\[[0-9;]*m/g, '').length)
  const lines = [chalk.bold(header), divider]
  for (const row of rows) {
    lines.push(columns.map((c, i) => cell(String(row[c.key] ?? ''), widths[i]!)).join('  '))
  }
  return lines.join('\n')
}

export const TASK_COLUMNS: Column<TaskSummary>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'NAME', maxWidth: 60 },
  { key: 'status', label: 'STATUS' },
  { key: 'list', label: 'LIST' },
]
