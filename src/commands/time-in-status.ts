import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { TimeInStatusResponse } from '../api.js'
import type { Config } from '../config.js'
import { isTTY, shouldOutputJson, formatTable, colorStatus } from '../output.js'
import type { Column } from '../output.js'
import { formatMarkdownTable } from '../markdown.js'
import type { MarkdownColumn } from '../markdown.js'
import { formatLongDuration } from '../date.js'

interface StatusDuration {
  status: string
  duration: string
  durationMs: number
  current: boolean
}

interface TimeInStatusResult {
  taskId: string
  statuses: StatusDuration[]
  totalMs: number
  total: string
}

function transformResponse(taskId: string, data: TimeInStatusResponse): TimeInStatusResult {
  const entries: StatusDuration[] = []

  for (const entry of data.status_history ?? []) {
    const ms = (entry.total_time?.by_minute ?? 0) * 60000
    entries.push({
      status: entry.status,
      duration: formatLongDuration(ms),
      durationMs: ms,
      current: false,
    })
  }

  if (data.current_status) {
    const ms = (data.current_status.total_time?.by_minute ?? 0) * 60000
    const existing = entries.find(e => e.status === data.current_status.status)
    if (existing) {
      existing.current = true
    } else {
      entries.push({
        status: data.current_status.status,
        duration: formatLongDuration(ms),
        durationMs: ms,
        current: true,
      })
    }
  }

  const totalMs = entries.reduce((sum, e) => sum + e.durationMs, 0)
  return { taskId, statuses: entries, totalMs, total: formatLongDuration(totalMs) }
}

export async function fetchTimeInStatus(
  config: Config,
  taskId: string,
): Promise<TimeInStatusResult> {
  const client = new ClickUpClient(config)
  let data: TimeInStatusResponse
  try {
    data = await client.getTimeInStatus(taskId)
  } catch (err) {
    if (err instanceof Error && /No data for TIS/i.test(err.message)) {
      throw new Error(
        'The "Time in Status" ClickApp is not enabled for this workspace.\n' +
          'Enable it in ClickUp: Space Settings → ClickApps → Time in Status',
        { cause: err },
      )
    }
    throw err
  }
  return transformResponse(taskId, data)
}

interface StatusRow {
  status: string
  duration: string
  current: string
}

export function printTimeInStatus(result: TimeInStatusResult, forceJson: boolean): void {
  if (shouldOutputJson(forceJson)) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const rows: StatusRow[] = result.statuses.map(s => ({
    status: s.status,
    duration: s.duration,
    current: s.current ? '*' : '',
  }))

  if (!isTTY()) {
    const mdColumns: MarkdownColumn<StatusRow>[] = [
      { key: 'status', label: 'Status' },
      { key: 'duration', label: 'Duration' },
      { key: 'current', label: 'Current' },
    ]
    const table = formatMarkdownTable(rows, mdColumns)
    console.log(`${table}\n\n**Total:** ${result.total}`)
    return
  }

  const columns: Column<StatusRow>[] = [
    { key: 'status', label: 'STATUS', maxWidth: 25, format: v => colorStatus(v) },
    { key: 'duration', label: 'DURATION' },
    { key: 'current', label: '', format: v => (v ? chalk.green('◀') : '') },
  ]
  console.log(formatTable(rows, columns))
  console.log('')
  console.log(`${chalk.bold('Total:')} ${result.total}`)
}
