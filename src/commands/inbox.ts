import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { TaskSummary } from './tasks.js'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function fetchInbox(config: Config): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const tasks = await client.getMyTasks(config.teamId, { subtasks: true })

  const cutoff = Date.now() - SEVEN_DAYS_MS
  return tasks
    .filter(t => Number(t.date_updated ?? 0) > cutoff)
    .sort((a, b) => Number(b.date_updated ?? 0) - Number(a.date_updated ?? 0))
    .map(t => ({
      id: t.id,
      name: t.name,
      status: t.status.status,
      task_type: (t.custom_item_id ?? 0) !== 0 ? 'initiative' : 'task',
      list: t.list.name,
      url: t.url,
      ...(t.parent ? { parent: t.parent } : {})
    }))
}
