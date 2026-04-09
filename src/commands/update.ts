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

export function parseDueDate(value: string, timezone?: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }
  const parts = value.split('-').map(Number)
  const y = parts[0] as number
  const m = parts[1] as number
  const d = parts[2] as number

  if (timezone) {
    try {
      const ms = dateToTimezoneMs(y, m, d, timezone)
      if (!isNaN(ms)) return ms
    } catch {
      // Invalid timezone string — fall through to UTC midnight
    }
  }

  const ms = Date.UTC(y, m - 1, d)
  if (isNaN(ms)) throw new Error(`Invalid date: ${value}`)
  return ms
}

function dateToTimezoneMs(year: number, month: number, day: number, timezone: string): number {
  // Find the UTC epoch that corresponds to midnight on YYYY-MM-DD in the given IANA timezone.
  // Step 1: treat the date as UTC midnight (approximate starting point).
  const approxUtc = new Date(Date.UTC(year, month - 1, day))
  // Step 2: express that UTC instant in the target timezone to find the TZ offset.
  const tzStr = approxUtc.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  // Step 3: parse the TZ-local string as if it were UTC to get its epoch.
  const tzDate = new Date(tzStr + ' UTC')
  // Step 4: offset = approxUtc - tzDate.
  // e.g. for UTC-4: approxUtc=00:00Z, tzDate=20:00Z (prev day) → offset=+4h
  // Midnight in the TZ = approxUtc + offset (shifts UTC midnight forward by the tz offset).
  const offset = approxUtc.getTime() - tzDate.getTime()
  return approxUtc.getTime() + offset
}

export function parseAssigneeId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id)) throw new Error('Assignee must be a numeric user ID or "me"')
  return id
}

export async function resolveAssigneeId(client: ClickUpClient, value: string): Promise<number> {
  if (value === 'me') {
    const user = await client.getMe()
    return user.id
  }
  return parseAssigneeId(value)
}

export function parseTimeEstimate(value: string): number {
  if (value === '0' || value.toLowerCase() === 'none' || value === '') return 0
  const pattern = /^(?:(\d+)h)?(?:(\d+)m)?$/i
  const match = value.match(pattern)
  if (match && (match[1] || match[2])) {
    const hours = Number(match[1] ?? 0)
    const minutes = Number(match[2] ?? 0)
    return (hours * 60 + minutes) * 60 * 1000
  }
  const ms = Number(value)
  if (Number.isFinite(ms) && ms >= 0) return ms
  throw new Error(
    'Time estimate must be a duration (e.g. "2h", "30m", "1h30m"), milliseconds, or "0" to clear',
  )
}

export interface UpdateCommandOptions {
  name?: string
  description?: string
  status?: string
  priority?: string
  dueDate?: string
  startDate?: string
  assignee?: string
  removeAssignee?: string
  timeEstimate?: string
  parent?: string
  detach?: boolean
  archive?: boolean
  unarchive?: boolean
  type?: string
}

export function buildUpdatePayload(
  opts: UpdateCommandOptions,
  timezone?: string,
): UpdateTaskOptions {
  if (opts.archive && opts.unarchive) {
    throw new Error('Cannot use --archive and --unarchive together')
  }
  if (opts.parent !== undefined && opts.detach) {
    throw new Error('Cannot use --parent and --detach together')
  }
  const payload: UpdateTaskOptions = {}
  if (opts.name !== undefined) {
    if (!opts.name.trim()) throw new Error('Task name cannot be empty')
    payload.name = opts.name
  }
  if (opts.description !== undefined) payload.markdown_content = opts.description
  if (opts.status !== undefined) payload.status = opts.status
  if (opts.priority !== undefined) payload.priority = parsePriority(opts.priority)
  if (opts.dueDate !== undefined) {
    if (opts.dueDate === 'none' || opts.dueDate === 'clear') {
      payload.due_date = null
    } else {
      payload.due_date = parseDueDate(opts.dueDate, timezone)
      payload.due_date_time = false
    }
  }
  if (opts.startDate !== undefined) {
    payload.start_date = parseDueDate(opts.startDate, timezone)
    payload.start_date_time = false
  }
  if (opts.assignee !== undefined || opts.removeAssignee !== undefined) {
    payload.assignees = {}
    if (opts.assignee !== undefined) {
      payload.assignees.add = [parseAssigneeId(opts.assignee)]
    }
    if (opts.removeAssignee !== undefined) {
      payload.assignees.rem = [parseAssigneeId(opts.removeAssignee)]
    }
  }
  if (opts.timeEstimate !== undefined) {
    payload.time_estimate = parseTimeEstimate(opts.timeEstimate)
  }
  if (opts.detach) {
    payload.parent = null
  } else if (opts.parent !== undefined) {
    payload.parent = opts.parent
  }
  if (opts.archive) payload.archived = true
  if (opts.unarchive) payload.archived = false
  if (opts.type !== undefined) {
    const num = Number(opts.type)
    if (Number.isInteger(num) && num >= 0) {
      payload.custom_item_id = num
    }
  }
  return payload
}

function hasUpdateFields(options: UpdateTaskOptions): boolean {
  return (
    options.name !== undefined ||
    options.description !== undefined ||
    options.markdown_content !== undefined ||
    options.status !== undefined ||
    options.priority !== undefined ||
    options.due_date !== undefined ||
    options.start_date !== undefined ||
    options.time_estimate !== undefined ||
    options.assignees !== undefined ||
    options.parent !== undefined ||
    options.archived !== undefined ||
    options.custom_item_id !== undefined
  )
}

async function resolveStatus(
  client: ClickUpClient,
  taskId: string,
  statusInput: string,
): Promise<string> {
  const task = await client.getTask(taskId)
  const list = await client.getListWithStatuses(task.list.id)
  const available = list.statuses.map(s => s.status)
  const matched = matchStatus(statusInput, available)

  if (!matched) {
    throw new Error(`No matching status for "${statusInput}". Available: ${available.join(', ')}`)
  }

  if (matched.toLowerCase() !== statusInput.toLowerCase()) {
    process.stderr.write(`Status matched: "${statusInput}" -> "${matched}"\n`)
  }

  return matched
}

export async function resolveTaskType(
  client: ClickUpClient,
  teamId: string,
  typeInput: string,
): Promise<number> {
  const types = await client.getCustomTaskTypes(teamId)
  const lower = typeInput.toLowerCase()
  const match = types.find(t => t.name.toLowerCase() === lower)
  if (!match) {
    const available = types.map(t => `${t.name} (${String(t.id)})`).join(', ')
    throw new Error(`No matching task type for "${typeInput}". Available: ${available}`)
  }
  return match.id
}

export async function updateTask(
  config: Config,
  taskId: string,
  options: UpdateTaskOptions,
  typeInput?: string,
): Promise<{ id: string; name: string }> {
  if (!hasUpdateFields(options) && typeInput === undefined)
    throw new Error(
      'Provide at least one of: --name, --description, --status, --priority, --due-date, --start-date, --time-estimate, --assignee, --remove-assignee, --parent, --detach, --archive, --unarchive, --type',
    )

  const client = new ClickUpClient(config)

  const resolved: UpdateTaskOptions = { ...options }
  if (resolved.status !== undefined) {
    resolved.status = await resolveStatus(client, taskId, resolved.status)
  }

  if (resolved.custom_item_id === undefined && typeInput !== undefined) {
    resolved.custom_item_id = await resolveTaskType(client, config.teamId, typeInput)
  }

  const task = await client.updateTask(taskId, resolved)
  return { id: task.id, name: task.name }
}
