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

export async function fetchMyTasks(config: Config, typeFilter?: 'task' | 'initiative'): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)

  const results = await Promise.all(
    config.lists.map(listId => client.getMyTasksFromList(listId))
  )
  const allTasks = results.flat()

  const filtered =
    typeFilter === 'initiative' ? allTasks.filter(isInitiative) :
    typeFilter === 'task' ? allTasks.filter(t => !isInitiative(t)) :
    allTasks

  return filtered.map(summarize)
}
