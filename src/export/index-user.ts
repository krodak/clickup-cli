import type { Task } from '../api.js'
import { isDoneStatus } from '../commands/tasks.js'
import { formatDateISO } from '../date.js'

export interface UserIndexOptions {
  exportedAt: string
  /** Space id -> display name, for the "where these live" summary. */
  spaceNames: Record<string, string>
}

function link(task: Task): string {
  return `[${task.name.replace(/\|/g, '\\|')}](../../tasks/${task.id}/task.md)`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function closedAt(task: Task): string | undefined {
  return task.date_closed ?? task.date_done ?? undefined
}

function monthOf(ms: string): string {
  return formatDateISO(ms).slice(0, 7)
}

/**
 * The personal archive index: what am I working on, what did I finish and
 * when, and where did it all live. Grouped by status for open work and by
 * month closed for done work, newest first.
 */
export function renderUserIndex(
  user: { username: string; id: number },
  tasks: Task[],
  opts: UserIndexOptions,
): string {
  const lines: string[] = [
    `# ${user.username} — tasks`,
    '',
    `Exported ${opts.exportedAt.slice(0, 10)} · ${tasks.length} tasks assigned · user id ${user.id}`,
    '',
  ]

  const open = tasks.filter(t => !isDoneStatus(t.status.status))
  const done = tasks.filter(t => isDoneStatus(t.status.status))

  const byStatus = new Map<string, Task[]>()
  for (const t of open) {
    const key = t.status.status.toLowerCase()
    byStatus.set(key, [...(byStatus.get(key) ?? []), t])
  }
  // Active work first, then whatever else, then to do.
  const order = (s: string) =>
    /progress|review|active/.test(s) ? 0 : /to ?do|open|backlog/.test(s) ? 2 : 1
  for (const [status, group] of [...byStatus.entries()].sort(
    (a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]),
  )) {
    lines.push(
      `## ${cap(status)} (${group.length})`,
      '',
      '| Task | List | Due |',
      '| --- | --- | --- |',
    )
    for (const t of group) {
      lines.push(`| ${link(t)} | ${t.list.name} | ${t.due_date ? formatDateISO(t.due_date) : ''} |`)
    }
    lines.push('')
  }

  if (done.length > 0) {
    lines.push(`## Done (${done.length})`, '')
    const byMonth = new Map<string, Task[]>()
    for (const t of done) {
      const when = closedAt(t)
      const key = when ? monthOf(when) : 'unknown'
      byMonth.set(key, [...(byMonth.get(key) ?? []), t])
    }
    for (const [month, group] of [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
      lines.push(`### ${month}`, '', '| Task | List | Closed |', '| --- | --- | --- |')
      for (const t of group) {
        const when = closedAt(t)
        lines.push(`| ${link(t)} | ${t.list.name} | ${when ? formatDateISO(when) : ''} |`)
      }
      lines.push('')
    }
  }

  const where = new Map<string, number>()
  for (const t of tasks) {
    const space = t.space?.id ? (opts.spaceNames[t.space.id] ?? t.space.id) : 'Unknown space'
    const key = `${space} / ${t.list.name}`
    where.set(key, (where.get(key) ?? 0) + 1)
  }
  lines.push('## Where these live', '')
  for (const [key, n] of [...where.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${key}: ${n}`)
  }
  lines.push('')
  return lines.join('\n')
}
