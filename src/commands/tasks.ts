import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'

export interface TaskSummary {
  id: string
  name: string
  status: string
  task_type: string
  list: string
  url: string
  parent?: string
}

function summarize(task: Task): TaskSummary {
  return {
    id: task.id,
    name: task.name,
    status: task.status.status,
    task_type: task.task_type ?? 'task',
    list: task.list.name,
    url: task.url,
    ...(task.parent ? { parent: task.parent } : {})
  }
}

export async function fetchMyTasks(config: Config, typeFilter?: string): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)

  const results = await Promise.all(
    config.lists.map(listId => client.getMyTasksFromList(listId))
  )
  const allTasks = results.flat()

  const filtered = typeFilter
    ? allTasks.filter(t => t.task_type === typeFilter)
    : allTasks

  return filtered.map(summarize)
}
