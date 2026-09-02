import type { Comment, CustomField } from '../api.js'
import { formatDateISO, formatDuration } from '../date.js'
import type { ExportedComment, TaskBundle } from './bundle.js'

/**
 * What the renderer needs to know about the archive around this task, so links
 * point at exported neighbours when they exist and at ClickUp when they do not.
 */
export interface RenderContext {
  hasTask: (id: string) => boolean
  /** Path relative to the task dir of the downloaded file, if any. */
  attachmentPath: (attachmentId: string) => string | undefined
  /** Display name for a space id, when known. */
  spaceName?: (spaceId: string) => string | undefined
}

const TASK_URL = (id: string) => `https://app.clickup.com/t/${id}`

/** Relative link to a sibling task bundle when exported, external otherwise. */
function taskLink(id: string, name: string | undefined, ctx: RenderContext): string {
  const label = name ?? id
  return ctx.hasTask(id)
    ? `[${label}](../${id}/task.md)`
    : `[${label}](${TASK_URL(id)}) (not exported)`
}

function isoDateTime(ms: string | number | null | undefined): string | undefined {
  if (ms == null || ms === '') return undefined
  const d = new Date(Number(ms))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function optionLabel(field: CustomField, value: unknown): string {
  const options = field.type_config?.options ?? []
  const hit = options.find(o => String(o.id) === String(value) || o.orderindex === value)
  return hit ? (hit.name ?? hit.label ?? String(value)) : String(value)
}

function isEmptyFieldValue(v: unknown): boolean {
  if (v == null || v === '') return true
  if (Array.isArray(v) && v.length === 0) return true
  return false
}

/** Render a custom field value as a single markdown table cell. */
function renderFieldValue(field: CustomField, ctx: RenderContext): string {
  const v = field.value
  switch (field.type) {
    case 'drop_down':
      return optionLabel(field, v)
    case 'labels':
      return (Array.isArray(v) ? v : [v]).map(x => optionLabel(field, x)).join(', ')
    case 'tasks': {
      const refs = Array.isArray(v) ? (v as Array<{ id: string; name?: string }>) : []
      return refs.map(r => taskLink(r.id, r.name, ctx)).join(', ')
    }
    case 'users': {
      const users = Array.isArray(v) ? (v as Array<{ username?: string; email?: string }>) : []
      return users.map(u => u.username ?? u.email ?? '?').join(', ')
    }
    case 'date':
      return formatDateISO(v as string | number)
    case 'checkbox':
      return v === true || v === 'true' ? 'yes' : 'no'
    case 'manual_progress':
      return typeof v === 'object' && v !== null && 'current' in v
        ? `${String(v.current)}%`
        : JSON.stringify(v)
    default:
      if (typeof v === 'string') return v
      if (typeof v === 'number' || typeof v === 'boolean') return String(v)
      return JSON.stringify(v)
  }
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export function renderTaskMarkdown(bundle: TaskBundle, ctx: RenderContext): string {
  const { task, fetchedAt } = bundle
  const lines: string[] = [`# ${task.name}`, '']
  const isInitiative = (task.custom_item_id ?? 0) !== 0

  const header: Array<[string, string | undefined]> = [
    ['ID', task.id],
    ['URL', task.url],
    ['Type', isInitiative ? 'initiative' : 'task'],
    ['Status', task.status.status],
    ['Archived', task.archived ? 'yes' : undefined],
    ['List', task.list.name],
    ['Folder', task.folder?.name],
    ['Space', task.space?.id ? (ctx.spaceName?.(task.space.id) ?? task.space.id) : undefined],
    ['Parent', task.parent ? taskLink(task.parent, undefined, ctx) : undefined],
    ['Assignees', task.assignees.map(a => a.username).join(', ') || undefined],
    ['Creator', task.creator?.username],
    ['Watchers', task.watchers?.map(w => w.username).join(', ') || undefined],
    ['Priority', task.priority?.priority],
    ['Tags', task.tags?.map(t => t.name).join(', ') || undefined],
    ['Start Date', task.start_date ? formatDateISO(task.start_date) : undefined],
    ['Due Date', task.due_date ? formatDateISO(task.due_date) : undefined],
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
    ['Created', isoDateTime(task.date_created)],
    ['Updated', isoDateTime(task.date_updated)],
    ['Closed', isoDateTime(task.date_closed)],
    ['Done', isoDateTime(task.date_done)],
    ['Exported', fetchedAt],
  ]
  for (const [label, value] of header) {
    if (value != null && value !== '') lines.push(`**${label}:** ${value}`)
  }

  const fields = (task.custom_fields ?? []).filter(f => !isEmptyFieldValue(f.value))
  if (fields.length > 0) {
    lines.push('', '## Custom Fields', '', '| Field | Value |', '| --- | --- |')
    for (const f of fields) {
      lines.push(`| ${escapeCell(f.name)} | ${escapeCell(renderFieldValue(f, ctx))} |`)
    }
  }

  const description = task.markdown_description ?? task.description
  if (description) lines.push('', '## Description', '', description)

  if (task.checklists?.length) {
    lines.push('', '## Checklists', '')
    for (const cl of task.checklists) {
      const resolved = cl.items.filter(i => i.resolved).length
      lines.push(`### ${cl.name} (${resolved}/${cl.items.length})`, '')
      for (const item of cl.items) lines.push(`- [${item.resolved ? 'x' : ' '}] ${item.name}`)
      lines.push('')
    }
  }

  if (task.subtasks?.length) {
    lines.push('', '## Subtasks', '')
    for (const s of task.subtasks) lines.push(`- ${taskLink(s.id, s.name, ctx)}`)
  }

  if (task.dependencies?.length) {
    lines.push('', '## Dependencies', '')
    for (const dep of task.dependencies) {
      const blocks = dep.depends_on === task.id
      const other = blocks ? dep.task_id : dep.depends_on
      lines.push(`- ${blocks ? 'blocks' : 'depends on'} ${taskLink(other, undefined, ctx)}`)
    }
  }

  if (task.linked_tasks?.length) {
    lines.push('', '## Linked Tasks', '')
    for (const lt of task.linked_tasks) lines.push(`- ${taskLink(lt.task_id, undefined, ctx)}`)
  }

  if (task.attachments?.length) {
    lines.push('', '## Attachments', '')
    for (const att of task.attachments) {
      const local = ctx.attachmentPath(att.id)
      lines.push(
        local ? `- [${att.title}](${local})` : `- [${att.title}](${att.url}) (not downloaded)`,
      )
    }
  }

  return lines.join('\n') + '\n'
}

function renderComment(c: Comment, quote: boolean): string[] {
  const prefix = quote ? '> ' : ''
  const when = isoDateTime(c.date) ?? c.date
  const body = c.comment_text.split(/\r?\n/).map(l => `${prefix}${l}`)
  return [`${prefix}**${c.user.username}** (${when})`, prefix.trimEnd(), ...body]
}

export function renderCommentsMarkdown(bundle: TaskBundle): string {
  const comments: ExportedComment[] = bundle.comments
  const lines: string[] = [`# Comments (${comments.length})`, '']
  if (comments.length === 0) {
    lines.push('No comments.')
    return lines.join('\n') + '\n'
  }
  for (const c of comments) {
    lines.push(...renderComment(c, false), '')
    for (const r of c.replies) lines.push(...renderComment(r, true), '')
    lines.push('---', '')
  }
  return lines.join('\n')
}
