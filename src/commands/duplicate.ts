import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Priority } from '../api.js'

const PRIORITY_MAP: Record<string, number> = { urgent: 1, high: 2, normal: 3, low: 4 }

export async function duplicateTask(
  config: Config,
  taskId: string,
): Promise<{ id: string; name: string; url: string }> {
  const client = new ClickUpClient(config)
  const task = await client.getTask(taskId)
  const created = await client.createTask(task.list.id, {
    name: `${task.name} (copy)`,
    description: task.description,
    markdown_content: task.markdown_content,
    priority: task.priority
      ? (PRIORITY_MAP[task.priority.priority.toLowerCase()] as Priority | undefined)
      : undefined,
    tags: task.tags?.map(t => t.name),
    time_estimate: task.time_estimate ?? undefined,
  })
  return { id: created.id, name: created.name, url: created.url }
}
