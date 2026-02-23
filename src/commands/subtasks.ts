import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { TaskSummary } from './tasks.js'

export async function fetchSubtasks(config: Config, taskId: string): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const parent = await client.getTask(taskId)
  // Fetch tasks from parent's list filtered by parent ID
  const tasks = await client.getTasksFromList(parent.list.id, { parent: taskId, subtasks: 'false' })
  return tasks.map(t => ({
    id: t.id,
    name: t.name,
    status: t.status.status,
    task_type: (t.custom_item_id ?? 0) !== 0 ? 'initiative' : 'task',
    list: t.list.name,
    url: t.url,
    ...(t.parent ? { parent: t.parent } : {})
  }))
}
