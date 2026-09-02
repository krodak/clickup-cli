import type { Task } from '../api.js'
import { isDoneStatus } from '../commands/tasks.js'
import { formatDateISO } from '../date.js'
import type { SpaceHierarchy } from './engine.js'

function link(task: Task): string {
  return `[${task.name.replace(/\|/g, '\\|')}](../../tasks/${task.id}/task.md)`
}

function assignees(task: Task): string {
  return task.assignees.map(a => a.username).join(', ')
}

function typeOf(task: Task, initiativeItemId?: number): string {
  const id = task.custom_item_id ?? 0
  if (id === 0) return 'task'
  return initiativeItemId !== undefined && id === initiativeItemId ? 'initiative' : `type ${id}`
}

function taskTable(tasks: Task[], initiativeItemId?: number): string[] {
  const lines = ['| Task | Status | Assignees | Type |', '| --- | --- | --- | --- |']
  for (const t of tasks) {
    lines.push(
      `| ${link(t)} | ${t.status.status} | ${assignees(t)} | ${typeOf(t, initiativeItemId)} |`,
    )
  }
  return lines
}

export interface TeamIndexOptions {
  exportedAt: string
  /** Other slices in the archive that cover one of this space's lists. */
  relatedSlices?: Array<{ name: string; listId: string }>
  initiativeItemId?: number
}

/**
 * The space-manager view: folderless lists, then folders with their lists,
 * mirroring the ClickUp sidebar. Only top-level tasks appear in list tables;
 * subtasks are reachable from their parent's task.md.
 */
export function renderTeamIndex(
  hierarchy: SpaceHierarchy,
  tasks: Task[],
  opts: TeamIndexOptions,
): string {
  const topLevel = tasks.filter(t => !t.parent)
  const byList = new Map<string, Task[]>()
  for (const t of topLevel) byList.set(t.list.id, [...(byList.get(t.list.id) ?? []), t])

  const listCount =
    hierarchy.lists.length + hierarchy.folders.reduce((n, f) => n + f.lists.length, 0)
  const folderWord = hierarchy.folders.length === 1 ? 'folder' : 'folders'
  const lines: string[] = [
    `# ${hierarchy.space.name} (space)`,
    '',
    `Exported ${opts.exportedAt.slice(0, 10)} · ${listCount} lists · ${hierarchy.folders.length} ${folderWord} · ${tasks.length} tasks`,
    '',
  ]

  const renderList = (list: { id: string; name: string }, level: number) => {
    const group = byList.get(list.id) ?? []
    const h = '#'.repeat(level)
    lines.push(`${h} ${list.name} — ${group.length} tasks`, '')
    const related = opts.relatedSlices?.filter(s => s.listId === list.id) ?? []
    for (const r of related) {
      lines.push(`→ see also [${r.name}](../${r.name}/README.md)`, '')
    }
    if (group.length > 0) lines.push(...taskTable(group, opts.initiativeItemId), '')
  }

  for (const list of hierarchy.lists) renderList(list, 2)
  for (const folder of hierarchy.folders) {
    lines.push(`## Folder: ${folder.name}`, '')
    for (const list of folder.lists) renderList(list, 3)
  }
  return lines.join('\n')
}

export interface RoadmapIndexOptions {
  exportedAt: string
  /** custom_item_id that marks an initiative; without it, nothing is grouped. */
  initiativeItemId?: number
}

function checkbox(task: Task): string {
  return isDoneStatus(task.status.status) ? '[x]' : '[ ]'
}

/**
 * The "what were we building" view: each initiative with its metadata and a
 * nested checklist of its subtask tree, then everything not under an
 * initiative.
 */
export function renderRoadmapIndex(
  list: { id: string; name: string },
  tasks: Task[],
  opts: RoadmapIndexOptions,
): string {
  const children = new Map<string, Task[]>()
  for (const t of tasks) {
    if (t.parent) children.set(t.parent, [...(children.get(t.parent) ?? []), t])
  }
  const isInitiative = (t: Task) =>
    opts.initiativeItemId !== undefined && t.custom_item_id === opts.initiativeItemId
  const initiatives = tasks.filter(t => !t.parent && isInitiative(t))
  const ungrouped = tasks.filter(t => !t.parent && !isInitiative(t))

  const lines: string[] = [
    `# ${list.name}`,
    '',
    `Exported ${opts.exportedAt.slice(0, 10)} · ${initiatives.length} initiatives · ${tasks.length} tasks`,
    '',
  ]

  const renderTree = (parentId: string, depth: number) => {
    for (const c of children.get(parentId) ?? []) {
      lines.push(`${'    '.repeat(depth)}- ${checkbox(c)} ${link(c)}`)
      renderTree(c.id, depth + 1)
    }
  }

  if (initiatives.length > 0) {
    lines.push('## Initiatives', '')
    for (const init of initiatives) {
      lines.push(`### ${link(init)} — ${init.status.status}`)
      const meta: string[] = []
      if (init.assignees.length > 0) meta.push(`Owner: ${assignees(init)}`)
      if (init.tags?.length) meta.push(`Tags: ${init.tags.map(t => t.name).join(', ')}`)
      if (init.start_date || init.due_date) {
        const from = init.start_date ? formatDateISO(init.start_date) : '?'
        const to = init.due_date ? formatDateISO(init.due_date) : '?'
        meta.push(`${from} → ${to}`)
      }
      if (meta.length > 0) lines.push(meta.join(' · '))
      lines.push('')
      if (children.has(init.id)) {
        renderTree(init.id, 0)
        lines.push('')
      }
    }
  }

  lines.push(`## Ungrouped tasks (${ungrouped.length})`, '')
  if (ungrouped.length > 0) {
    lines.push('| Task | Status | Assignees |', '| --- | --- | --- |')
    for (const t of ungrouped) lines.push(`| ${link(t)} | ${t.status.status} | ${assignees(t)} |`)
    lines.push('')
  }
  return lines.join('\n')
}
