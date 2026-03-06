import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { TaskSummary } from './tasks.js'
import { summarize } from './tasks.js'

export async function fetchSubtasks(
  config: Config,
  taskId: string,
  options: { includeClosed?: boolean } = {},
): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const parent = await client.getTask(taskId)
  const tasks = await client.getTasksFromList(
    parent.list.id,
    { parent: taskId, subtasks: 'false' },
    { includeClosed: options.includeClosed },
  )
  return tasks.map(summarize)
}
