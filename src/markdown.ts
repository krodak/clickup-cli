import type { Task } from './api.js'
import type { TaskSummary } from './commands/tasks.js'
import type { CommentSummary } from './commands/comments.js'
import type { ListSummary } from './commands/lists.js'

export interface MarkdownColumn<T> {
  key: keyof T & string
  label: string
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|')
}

export function formatMarkdownTable<T>(rows: T[], columns: MarkdownColumn<T>[]): string {
  const header = '| ' + columns.map(c => c.label).join(' | ') + ' |'
  const divider = '| ' + columns.map(() => '---').join(' | ') + ' |'
  const lines = [header, divider]
  for (const row of rows) {
    const cells = columns.map(c => escapeCell(String(row[c.key] ?? '')))
    lines.push('| ' + cells.join(' | ') + ' |')
  }
  return lines.join('\n')
}

const TASK_MD_COLUMNS: MarkdownColumn<TaskSummary>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'list', label: 'List' },
]

export function formatTasksMarkdown(tasks: TaskSummary[]): string {
  if (tasks.length === 0) return 'No tasks found.'
  return formatMarkdownTable(tasks, TASK_MD_COLUMNS)
}

export function formatCommentsMarkdown(comments: CommentSummary[]): string {
  if (comments.length === 0) return 'No comments found.'
  return comments.map(c => `**${c.user}** (${c.date})\n\n${c.text}`).join('\n\n---\n\n')
}

const LIST_MD_COLUMNS: MarkdownColumn<ListSummary>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'folder', label: 'Folder' },
]

export function formatListsMarkdown(lists: ListSummary[]): string {
  if (lists.length === 0) return 'No lists found.'
  return formatMarkdownTable(lists, LIST_MD_COLUMNS)
}

const SPACE_MD_COLUMNS: MarkdownColumn<{ id: string; name: string }>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
]

export function formatSpacesMarkdown(spaces: Array<{ id: string; name: string }>): string {
  if (spaces.length === 0) return 'No spaces found.'
  return formatMarkdownTable(spaces, SPACE_MD_COLUMNS)
}

export function formatGroupedTasksMarkdown(
  groups: Array<{ label: string; tasks: TaskSummary[] }>,
): string {
  const sections = groups
    .filter(g => g.tasks.length > 0)
    .map(g => `## ${g.label}\n\n${formatMarkdownTable(g.tasks, TASK_MD_COLUMNS)}`)
  if (sections.length === 0) return 'No tasks found.'
  return sections.join('\n\n')
}

function formatDate(ms: string): string {
  const d = new Date(Number(ms))
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

export function formatTaskDetailMarkdown(task: Task): string {
  const lines: string[] = [`# ${task.name}`, '']

  const isInitiative = (task.custom_item_id ?? 0) !== 0

  const fields: Array<[string, string | undefined]> = [
    ['ID', task.id],
    ['Status', task.status.status],
    ['Type', isInitiative ? 'initiative' : 'task'],
    ['List', task.list.name],
    ['URL', task.url],
    [
      'Assignees',
      task.assignees.length > 0 ? task.assignees.map(a => a.username).join(', ') : undefined,
    ],
    ['Priority', task.priority?.priority],
    ['Parent', task.parent ?? undefined],
    ['Start Date', task.start_date ? formatDate(task.start_date) : undefined],
    ['Due Date', task.due_date ? formatDate(task.due_date) : undefined],
    [
      'Time Estimate',
      task.time_estimate != null && task.time_estimate > 0
        ? formatDuration(task.time_estimate)
        : undefined,
    ],
    [
      'Time Spent',
      task.time_spent != null && task.time_spent > 0 ? formatDuration(task.time_spent) : undefined,
    ],
    ['Tags', task.tags && task.tags.length > 0 ? task.tags.map(t => t.name).join(', ') : undefined],
    ['Created', task.date_created ? formatDate(task.date_created) : undefined],
    ['Updated', task.date_updated ? formatDate(task.date_updated) : undefined],
  ]

  for (const [label, value] of fields) {
    if (value != null && value !== '') {
      lines.push(`**${label}:** ${value}`)
    }
  }

  if (task.description) {
    lines.push('', '## Description', '', task.description)
  }

  return lines.join('\n')
}

export function formatUpdateConfirmation(id: string, name: string): string {
  return `Updated task ${id}: "${name}"`
}

export function formatCreateConfirmation(id: string, name: string, url: string): string {
  return `Created task ${id}: "${name}" - ${url}`
}

export function formatCommentConfirmation(id: string): string {
  return `Comment posted (id: ${id})`
}

export function formatAssignConfirmation(
  taskId: string,
  opts: { to?: string; remove?: string },
): string {
  const parts: string[] = []
  if (opts.to) parts.push(`Assigned ${opts.to} to ${taskId}`)
  if (opts.remove) parts.push(`Removed ${opts.remove} from ${taskId}`)
  return parts.join('; ')
}
