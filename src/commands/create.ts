import { ClickUpClient } from '../api.js'
import type { CreateTaskOptions } from '../api.js'
import type { Config } from '../config.js'
import { parsePriority, parseDueDate, parseAssigneeId, parseTimeEstimate } from './update.js'

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
  customItemId?: string
  timeEstimate?: string
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
    ...(options.description !== undefined ? { markdown_content: options.description } : {}),
    ...(options.parent !== undefined ? { parent: options.parent } : {}),
    ...(options.status !== undefined ? { status: options.status } : {}),
  }

  if (options.priority !== undefined) {
    payload.priority = parsePriority(options.priority)
  }
  if (options.dueDate !== undefined) {
    payload.due_date = parseDueDate(options.dueDate)
    payload.due_date_time = false
  }
  if (options.assignee !== undefined) {
    payload.assignees = [parseAssigneeId(options.assignee)]
  }
  if (options.tags !== undefined) {
    payload.tags = options.tags.split(',').map(t => t.trim())
  }
  if (options.customItemId !== undefined) {
    const id = Number(options.customItemId)
    if (!Number.isInteger(id) || id < 0)
      throw new Error('Custom item ID must be a non-negative integer')
    payload.custom_item_id = id
  }
  if (options.timeEstimate !== undefined) {
    payload.time_estimate = parseTimeEstimate(options.timeEstimate)
  }

  const task = await client.createTask(listId, payload)
  return { id: task.id, name: task.name, url: task.url }
}
