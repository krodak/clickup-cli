import { ClickUpClient } from '../api.js'
import type { CreateTaskOptions } from '../api.js'
import type { Config } from '../config.js'
import { compileForTask, compilePlain, descriptionNeedsAssets } from '../cufm/publish.js'
import { parsePriority, parseDueDate, parseAssigneeId, parseTimeEstimate } from './update.js'

export interface CreateOptions {
  list?: string
  name: string
  description?: string
  parent?: string
  status?: string
  priority?: string
  dueDate?: string
  startDate?: string
  assignee?: string
  groupAssigneeIds?: string[]
  tags?: string
  customItemId?: string
  timeEstimate?: string
  template?: string
  customFields?: Array<{ id: string; value: unknown }>
}

export async function createTask(
  config: Config,
  options: CreateOptions,
): Promise<{ id: string; name: string; url: string }> {
  if (!options.name.trim()) throw new Error('Task name cannot be empty')

  const client = new ClickUpClient(config)

  let listId = options.list
  let parentId = options.parent
  if (options.parent) {
    if (!listId) {
      // Fetch the parent to auto-detect its list; this also gives the native id
      // (getTask resolves workspace custom ids like PROD-811).
      const parentTask = await client.getTask(options.parent)
      parentId = parentTask.id
      listId = parentTask.list.id
    } else {
      // List already known — still resolve custom ids/URLs to a native id, since
      // the create payload's `parent` field must be a native task id.
      parentId = await client.resolveTaskId(options.parent)
    }
  }
  if (!listId) {
    throw new Error('Provide --list or --parent (list is auto-detected from parent task)')
  }

  if (options.template) {
    const task = await client.createTaskFromTemplate(listId, options.template, options.name)
    return { id: task.id, name: task.name, url: task.url }
  }

  const timezone = await client.getUserTimezone()

  const payload: CreateTaskOptions = {
    name: options.name,
    ...(parentId !== undefined ? { parent: parentId } : {}),
    ...(options.status !== undefined ? { status: options.status } : {}),
  }

  const needsAssets =
    options.description !== undefined &&
    options.description !== '' &&
    descriptionNeedsAssets(options.description)
  if (options.description !== undefined && !needsAssets) {
    if (options.description === '') payload.description = ''
    else {
      const compiled = compilePlain(options.description)
      for (const w of compiled.warnings) console.error(`warning: ${w}`)
      payload.description = { ops: compiled.ops }
    }
  }

  if (options.priority !== undefined) {
    payload.priority = parsePriority(options.priority)
  }
  if (options.dueDate !== undefined) {
    const parsed = parseDueDate(options.dueDate, timezone)
    payload.due_date = parsed.ms
    payload.due_date_time = parsed.hasTime
  }
  if (options.startDate !== undefined) {
    const parsed = parseDueDate(options.startDate, timezone)
    payload.start_date = parsed.ms
    payload.start_date_time = parsed.hasTime
  }
  if (options.assignee !== undefined) {
    payload.assignees = [parseAssigneeId(options.assignee)]
  }
  if (options.groupAssigneeIds !== undefined && options.groupAssigneeIds.length > 0) {
    payload.group_assignees = options.groupAssigneeIds
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
  if (options.customFields !== undefined && options.customFields.length > 0) {
    payload.custom_fields = options.customFields
  }

  const task = await client.createTask(listId, payload)
  if (needsAssets && options.description) {
    const compiled = await compileForTask({
      markdown: options.description,
      client,
      taskId: task.id,
      baseDir: process.cwd(),
      media: {},
    })
    for (const w of compiled.warnings) console.error(`warning: ${w}`)
    await client.updateTask(task.id, { description: { ops: compiled.ops } })
  }
  return { id: task.id, name: task.name, url: task.url }
}
