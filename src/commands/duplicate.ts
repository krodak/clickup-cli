import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Priority } from '../api.js'

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
    priority: task.priority ? (Number(task.priority.priority) as Priority) : undefined,
    tags: task.tags?.map(t => t.name),
    time_estimate: task.time_estimate ?? undefined,
  })
  return { id: created.id, name: created.name, url: created.url }
}
