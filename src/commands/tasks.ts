import { ClickUpClient } from '../api.js'
import type { Task, TaskFilters } from '../api.js'
import type { Config } from '../config.js'
import { formatTable, isTTY, TASK_COLUMNS } from '../output.js'

export interface TaskSummary {
  id: string
  name: string
  status: string
  task_type: string
  list: string
  url: string
  parent?: string
}

export interface FetchOptions {
  statuses?: string[]
  listIds?: string[]
  spaceIds?: string[]
  typeFilter?: 'task' | 'initiative'
}

function isInitiative(task: Task): boolean {
  return (task.custom_item_id ?? 0) !== 0
}

function summarize(task: Task): TaskSummary {
  return {
    id: task.id,
    name: task.name,
    status: task.status.status,
    task_type: isInitiative(task) ? 'initiative' : 'task',
    list: task.list.name,
    url: task.url,
    ...(task.parent ? { parent: task.parent } : {})
  }
}

export async function fetchMyTasks(config: Config, opts: FetchOptions = {}): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const { typeFilter, ...apiFilters } = opts

  const apiFilterParams: TaskFilters = {
    statuses: apiFilters.statuses,
    listIds: apiFilters.listIds,
    spaceIds: apiFilters.spaceIds,
  }

  const allTasks = await client.getMyTasks(config.teamId, apiFilterParams)

  const filtered =
    typeFilter === 'initiative' ? allTasks.filter(isInitiative) :
    typeFilter === 'task' ? allTasks.filter(t => !isInitiative(t)) :
    allTasks

  return filtered.map(summarize)
}

export function printTasks(tasks: TaskSummary[], forceJson: boolean): void {
  if (!forceJson && isTTY()) {
    if (tasks.length === 0) {
      console.log('No tasks found.')
      return
    }
    console.log(formatTable(tasks as unknown as Record<string, unknown>[], TASK_COLUMNS))
  } else {
    console.log(JSON.stringify(tasks, null, 2))
  }
}
