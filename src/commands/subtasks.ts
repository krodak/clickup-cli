import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { TaskSummary } from './tasks.js'
import { summarize, buildTypeMap } from './tasks.js'

export async function fetchSubtasks(
  config: Config,
  taskId: string,
  options: { includeClosed?: boolean } = {},
): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const [parent, customTypes] = await Promise.all([
    client.getTask(taskId),
    client.getCustomTaskTypes(config.teamId),
  ])
  const typeMap = buildTypeMap(customTypes)
  const tasks = await client.getTasksFromList(
    parent.list.id,
    { parent: taskId, subtasks: 'false' },
    { includeClosed: options.includeClosed },
  )
  return tasks.map(t => summarize(t, typeMap))
}
