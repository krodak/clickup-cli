import chalk from 'chalk'

export interface Column {
  key: string
  label: string
  width: number
}

export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY)
}

function cell(value: string, width: number): string {
  if (value.length > width) return value.slice(0, width - 1) + '…'
  return value.padEnd(width)
}

export function formatTable(rows: Record<string, unknown>[], columns: Column[]): string {
  const header = columns.map(c => cell(c.label, c.width)).join('  ')
  const divider = '-'.repeat(header.replace(/\x1b\[[0-9;]*m/g, '').length)
  const lines = [chalk.bold(header), divider]
  for (const row of rows) {
    lines.push(columns.map(c => cell(String(row[c.key] ?? ''), c.width)).join('  '))
  }
  return lines.join('\n')
}

export const TASK_COLUMNS: Column[] = [
  { key: 'id', label: 'ID', width: 12 },
  { key: 'name', label: 'NAME', width: 55 },
  { key: 'status', label: 'STATUS', width: 14 },
  { key: 'list', label: 'LIST', width: 30 },
]
