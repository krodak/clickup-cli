import { ClickUpClient } from '../api.js'
import type { Task, TaskFilters, CustomTaskType } from '../api.js'
import type { Config } from '../config.js'
import { formatDate } from '../date.js'
import { isTTY, shouldOutputJson } from '../output.js'
import { formatTasksMarkdown } from '../markdown.js'
import { interactiveTaskPicker, showDetailsAndOpen } from '../interactive.js'

export interface TaskSummary {
  id: string
  name: string
  status: string
  task_type: string
  priority: string
  due_date: string
  list: string
  url: string
  parent?: string
}

interface FetchOptions extends TaskFilters {
  typeFilter?: string
  name?: string
}

const DONE_PATTERNS = ['done', 'complete', 'closed']

export function isDoneStatus(status: string): boolean {
  const lower = status.toLowerCase()
  return DONE_PATTERNS.some(p => lower.includes(p))
}

function formatDueDate(ms: string | null | undefined): string {
  if (!ms) return ''
  return formatDate(ms)
}

function resolveTaskType(task: Task, typeMap: Map<number, string>): string {
  const id = task.custom_item_id ?? 0
  if (id === 0) return 'task'
  return typeMap.get(id) ?? `type_${id}`
}

export function summarize(task: Task, typeMap?: Map<number, string>): TaskSummary {
  return {
    id: task.id,
    name: task.name,
    status: task.status.status,
    task_type: resolveTaskType(task, typeMap ?? new Map<number, string>()),
    priority: task.priority?.priority ?? 'none',
    due_date: formatDueDate(task.due_date),
    list: task.list.name,
    url: task.url,
    ...(task.parent ? { parent: task.parent } : {}),
  }
}

export function buildTypeMap(types: CustomTaskType[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const t of types) {
    map.set(t.id, t.name)
  }
  return map
}

function resolveTypeFilter(typeFilter: string, typeMap: Map<number, string>): number | undefined {
  if (typeFilter === 'task') return 0
  const asNum = Number(typeFilter)
  if (Number.isFinite(asNum)) return asNum
  const lower = typeFilter.toLowerCase()
  for (const [id, name] of typeMap) {
    if (name.toLowerCase() === lower) return id
  }
  const available = ['task', ...Array.from(typeMap.values())].join(', ')
  throw new Error(`Unknown task type "${typeFilter}". Available types: ${available}`)
}

export async function fetchMyTasks(
  config: Config,
  opts: FetchOptions = {},
): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const { typeFilter, name, ...apiFilters } = opts

  const [allTasks, customTypes] = await Promise.all([
    client.getMyTasks(config.teamId, apiFilters),
    client.getCustomTaskTypes(config.teamId),
  ])

  const typeMap = buildTypeMap(customTypes)

  let filtered = allTasks
  if (typeFilter) {
    const targetId = resolveTypeFilter(typeFilter, typeMap)
    filtered = allTasks.filter(t => (t.custom_item_id ?? 0) === targetId)
  }

  if (name) {
    const query = name.toLowerCase()
    filtered = filtered.filter(t => t.name.toLowerCase().includes(query))
  }

  return filtered.map(t => summarize(t, typeMap))
}

export async function printTasks(
  tasks: TaskSummary[],
  forceJson: boolean,
  config?: Config,
): Promise<void> {
  if (shouldOutputJson(forceJson)) {
    console.log(JSON.stringify(tasks, null, 2))
    return
  }
  if (!isTTY()) {
    console.log(formatTasksMarkdown(tasks))
    return
  }

  if (tasks.length === 0) {
    console.log('No tasks found.')
    return
  }

  const fetchTask = config
    ? (() => {
        const client = new ClickUpClient(config)
        return (id: string) => client.getTask(id)
      })()
    : undefined

  const selected = await interactiveTaskPicker(tasks)
  await showDetailsAndOpen(selected, fetchTask)
}
