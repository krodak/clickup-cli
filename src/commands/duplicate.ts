import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { parsePriority } from './update.js'

export async function duplicateTask(
  config: Config,
  taskId: string,
): Promise<{ id: string; name: string; url: string }> {
  const client = new ClickUpClient(config)
  const task = await client.getTask(taskId)
  const created = await client.createTask(task.list.id, {
    name: `${task.name} (copy)`,
    description: task.description,
    // getTask requests include_markdown_description=true, so the source markdown
    // lives in markdown_description (markdown_content is always null on read).
    markdown_content: task.markdown_description ?? task.description,
    priority: task.priority ? parsePriority(task.priority.priority.toLowerCase()) : undefined,
    tags: task.tags?.map(t => t.name),
    time_estimate: task.time_estimate ?? undefined,
  })
  return { id: created.id, name: created.name, url: created.url }
}
