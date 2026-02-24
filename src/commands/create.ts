import { ClickUpClient } from '../api.js'
import type { CreateTaskOptions } from '../api.js'
import type { Config } from '../config.js'
import { parsePriority, parseDueDate } from './update.js'

export interface CreateOptions {
  list?: string
  name: string
  description?: string
  parent?: string
  status?: string
  priority?: string
  dueDate?: string
  assignee?: string
  tags?: string
}

export async function createTask(
  config: Config,
  options: CreateOptions,
): Promise<{ id: string; name: string; url: string }> {
  const client = new ClickUpClient(config)

  let listId = options.list
  if (!listId && options.parent) {
    const parentTask = await client.getTask(options.parent)
    listId = parentTask.list.id
  }
  if (!listId) {
    throw new Error('Provide --list or --parent (list is auto-detected from parent task)')
  }

  const payload: CreateTaskOptions = {
    name: options.name,
    ...(options.description ? { description: options.description } : {}),
    ...(options.parent ? { parent: options.parent } : {}),
    ...(options.status ? { status: options.status } : {}),
  }

  if (options.priority) {
    payload.priority = parsePriority(options.priority)
  }
  if (options.dueDate) {
    payload.due_date = parseDueDate(options.dueDate)
    payload.due_date_time = false
  }
  if (options.assignee) {
    const id = Number(options.assignee)
    if (!Number.isInteger(id)) throw new Error('Assignee must be a numeric user ID')
    payload.assignees = [id]
  }
  if (options.tags) {
    payload.tags = options.tags.split(',').map(t => t.trim())
  }

  const task = await client.createTask(listId, payload)
  return { id: task.id, name: task.name, url: task.url }
}
