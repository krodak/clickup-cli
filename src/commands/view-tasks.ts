import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { buildTypeMap, summarize } from './tasks.js'
import type { TaskSummary } from './tasks.js'

export async function listViewTasks(
  config: Config,
  viewId: string,
  opts: { me?: boolean },
): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const [tasks, customTypes] = await Promise.all([
    client.getViewTasks(viewId),
    client.getCustomTaskTypes(config.teamId),
  ])
  const typeMap = buildTypeMap(customTypes)

  let filtered = tasks
  if (opts.me) {
    const me = await client.getMe()
    filtered = tasks.filter(t => t.assignees.some(a => Number(a.id) === me.id))
  }

  return filtered.map(t => summarize(t, typeMap))
}
