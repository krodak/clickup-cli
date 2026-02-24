import { ClickUpClient } from '../api.js'
import type { Task, TaskFilters } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'
import { interactiveTaskPicker, showDetailsAndOpen } from '../interactive.js'

export interface TaskSummary {
  id: string
  name: string
  status: string
  task_type: 'task' | 'initiative'
  list: string
  url: string
  parent?: string
}

export interface FetchOptions extends TaskFilters {
  typeFilter?: 'task' | 'initiative'
  name?: string
}

function isInitiative(task: Task): boolean {
  return (task.custom_item_id ?? 0) !== 0
}

export function summarize(task: Task): TaskSummary {
  return {
    id: task.id,
    name: task.name,
    status: task.status.status,
    task_type: isInitiative(task) ? 'initiative' : 'task',
    list: task.list.name,
    url: task.url,
    ...(task.parent ? { parent: task.parent } : {}),
  }
}

export async function fetchMyTasks(
  config: Config,
  opts: FetchOptions = {},
): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const { typeFilter, name, ...apiFilters } = opts

  const allTasks = await client.getMyTasks(config.teamId, apiFilters)

  let filtered =
    typeFilter === 'initiative'
      ? allTasks.filter(isInitiative)
      : typeFilter === 'task'
        ? allTasks.filter(t => !isInitiative(t))
        : allTasks

  if (name) {
    const query = name.toLowerCase()
    filtered = filtered.filter(t => t.name.toLowerCase().includes(query))
  }

  return filtered.map(summarize)
}

export async function printTasks(
  tasks: TaskSummary[],
  forceJson: boolean,
  config?: Config,
): Promise<void> {
  if (forceJson || !isTTY()) {
    console.log(JSON.stringify(tasks, null, 2))
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
