import { ClickUpClient } from '../api.js'
import type { UpdateTaskOptions } from '../api.js'
import type { Config } from '../config.js'

export type { UpdateTaskOptions }

const PRIORITY_MAP: Record<string, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
}

export function parsePriority(value: string): number {
  const named = PRIORITY_MAP[value.toLowerCase()]
  if (named !== undefined) return named
  const num = Number(value)
  if (Number.isInteger(num) && num >= 1 && num <= 4) return num
  throw new Error('Priority must be urgent, high, normal, low, or 1-4')
}

export function parseDueDate(value: string): number {
  const date = new Date(value)
  if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`)
  return date.getTime()
}

export interface UpdateCommandOptions {
  name?: string
  description?: string
  status?: string
  priority?: string
  dueDate?: string
  assignee?: string
}

export function buildUpdatePayload(opts: UpdateCommandOptions): UpdateTaskOptions {
  const payload: UpdateTaskOptions = {}
  if (opts.name) payload.name = opts.name
  if (opts.description) payload.description = opts.description
  if (opts.status) payload.status = opts.status
  if (opts.priority) payload.priority = parsePriority(opts.priority)
  if (opts.dueDate) {
    payload.due_date = parseDueDate(opts.dueDate)
    payload.due_date_time = false
  }
  if (opts.assignee) {
    const id = Number(opts.assignee)
    if (!Number.isInteger(id)) throw new Error('Assignee must be a numeric user ID')
    payload.assignees = { add: [id] }
  }
  return payload
}

export async function updateTask(
  config: Config,
  taskId: string,
  options: UpdateTaskOptions,
): Promise<{ id: string; name: string }> {
  const hasAny = Object.values(options).some(v => v !== undefined && String(v).trim() !== '')
  if (!hasAny)
    throw new Error(
      'Provide at least one of: --name, --description, --status, --priority, --due-date, --assignee',
    )

  const client = new ClickUpClient(config)
  const task = await client.updateTask(taskId, options)
  return { id: task.id, name: task.name }
}

export async function updateDescription(
  config: Config,
  taskId: string,
  description: string,
): Promise<{ id: string; name: string }> {
  return updateTask(config, taskId, { description })
}
