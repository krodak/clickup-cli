import { ClickUpClient } from '../api.js'
import type { UpdateTaskOptions, Priority } from '../api.js'
import type { Config } from '../config.js'
import { matchStatus } from '../status.js'

const PRIORITY_MAP = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
} as const satisfies Record<string, Priority>

export function parsePriority(value: string): Priority {
  const named = PRIORITY_MAP[value.toLowerCase() as keyof typeof PRIORITY_MAP]
  if (named !== undefined) return named
  const num = Number(value)
  if (Number.isInteger(num) && num >= 1 && num <= 4) return num as Priority
  throw new Error('Priority must be urgent, high, normal, low, or 1-4')
}

export function parseDueDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }
  const date = new Date(value)
  if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`)
  return date.getTime()
}

export function parseAssigneeId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id)) throw new Error('Assignee must be a numeric user ID')
  return id
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
  if (opts.name !== undefined) payload.name = opts.name
  if (opts.description !== undefined) payload.description = opts.description
  if (opts.status !== undefined) payload.status = opts.status
  if (opts.priority !== undefined) payload.priority = parsePriority(opts.priority)
  if (opts.dueDate !== undefined) {
    payload.due_date = parseDueDate(opts.dueDate)
    payload.due_date_time = false
  }
  if (opts.assignee !== undefined) {
    payload.assignees = { add: [parseAssigneeId(opts.assignee)] }
  }
  return payload
}

function hasUpdateFields(options: UpdateTaskOptions): boolean {
  return (
    options.name !== undefined ||
    options.description !== undefined ||
    options.status !== undefined ||
    options.priority !== undefined ||
    options.due_date !== undefined ||
    options.assignees !== undefined
  )
}

async function resolveStatus(
  client: ClickUpClient,
  taskId: string,
  statusInput: string,
): Promise<string> {
  const task = await client.getTask(taskId)
  if (!task.space) return statusInput

  const space = await client.getSpaceWithStatuses(task.space.id)
  const available = space.statuses.map(s => s.status)
  const matched = matchStatus(statusInput, available)

  if (!matched) {
    throw new Error(`No matching status for "${statusInput}". Available: ${available.join(', ')}`)
  }

  if (matched.toLowerCase() !== statusInput.toLowerCase()) {
    process.stderr.write(`Status matched: "${statusInput}" -> "${matched}"\n`)
  }

  return matched
}

export async function updateTask(
  config: Config,
  taskId: string,
  options: UpdateTaskOptions,
): Promise<{ id: string; name: string }> {
  if (!hasUpdateFields(options))
    throw new Error(
      'Provide at least one of: --name, --description, --status, --priority, --due-date, --assignee',
    )

  const client = new ClickUpClient(config)

  if (options.status !== undefined) {
    options.status = await resolveStatus(client, taskId, options.status)
  }

  const task = await client.updateTask(taskId, options)
  return { id: task.id, name: task.name }
}

export async function updateDescription(
  config: Config,
  taskId: string,
  description: string,
): Promise<{ id: string; name: string }> {
  if (!description.trim()) throw new Error('Description cannot be empty')
  return updateTask(config, taskId, { description })
}
