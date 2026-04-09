import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { resolveAssigneeId, parseDueDate, parsePriority } from './update.js'
import { findFieldByName, parseFieldValue } from './field.js'

export type BulkResult = { updated: number; failed: Array<{ id: string; reason: string }> }

const BULK_CONCURRENCY = 5

async function runInBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<{ item: T; result?: R; error?: Error }>> {
  const results: Array<{ item: T; result?: R; error?: Error }> = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(fn))
    batchResults.forEach((res, idx) => {
      const item = batch[idx]!
      if (res.status === 'fulfilled') {
        results.push({ item, result: res.value })
      } else {
        results.push({
          item,
          error: res.reason instanceof Error ? res.reason : new Error(String(res.reason)),
        })
      }
    })
  }
  return results
}

function toBulkResult(
  outcomes: Array<{ item: string; result?: unknown; error?: Error }>,
): BulkResult {
  const failed: Array<{ id: string; reason: string }> = []
  for (const outcome of outcomes) {
    if (outcome.error) {
      failed.push({ id: outcome.item, reason: outcome.error.message })
    }
  }
  return { updated: outcomes.length - failed.length, failed }
}

export async function bulkUpdateStatus(
  config: Config,
  taskIds: string[],
  status: string,
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const outcomes = await runInBatches(taskIds, BULK_CONCURRENCY, id =>
    client.updateTask(id, { status }),
  )
  return toBulkResult(outcomes)
}

export async function bulkAssign(
  config: Config,
  userIdOrMe: string,
  taskIds: string[],
  action: 'add' | 'remove',
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const numericId = await resolveAssigneeId(client, userIdOrMe)
  const payload =
    action === 'add' ? { assignees: { add: [numericId] } } : { assignees: { rem: [numericId] } }
  const outcomes = await runInBatches(taskIds, BULK_CONCURRENCY, id =>
    client.updateTask(id, payload),
  )
  return toBulkResult(outcomes)
}

export async function bulkDueDate(
  config: Config,
  date: string,
  taskIds: string[],
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const timezone = await client.getUserTimezone()
  const payload =
    date === 'none' || date === 'clear'
      ? { due_date: null }
      : { due_date: parseDueDate(date, timezone), due_date_time: false }
  const outcomes = await runInBatches(taskIds, BULK_CONCURRENCY, id =>
    client.updateTask(id, payload),
  )
  return toBulkResult(outcomes)
}

export async function bulkTag(
  config: Config,
  tagName: string,
  taskIds: string[],
  action: 'add' | 'remove',
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const outcomes = await runInBatches(taskIds, BULK_CONCURRENCY, id =>
    action === 'add' ? client.addTagToTask(id, tagName) : client.removeTagFromTask(id, tagName),
  )
  return toBulkResult(outcomes)
}

export async function bulkPriority(
  config: Config,
  priorityValue: string,
  taskIds: string[],
): Promise<BulkResult> {
  const priority = parsePriority(priorityValue)
  const client = new ClickUpClient(config)
  const outcomes = await runInBatches(taskIds, BULK_CONCURRENCY, id =>
    client.updateTask(id, { priority }),
  )
  return toBulkResult(outcomes)
}

export async function bulkField(
  config: Config,
  fieldName: string,
  rawValue: string,
  taskIds: string[],
): Promise<BulkResult> {
  if (taskIds.length === 0) return { updated: 0, failed: [] }
  const client = new ClickUpClient(config)
  const firstTask = await client.getTask(taskIds[0]!)
  const fields = firstTask.custom_fields ?? []
  const field = findFieldByName(fields, fieldName)
  const parsed = parseFieldValue(field, rawValue)
  const outcomes = await runInBatches(taskIds, BULK_CONCURRENCY, id =>
    client.setCustomFieldValue(id, field.id, parsed),
  )
  return toBulkResult(outcomes)
}

export async function bulkMove(
  config: Config,
  listId: string,
  taskIds: string[],
): Promise<BulkResult> {
  if (!listId) throw new Error('--to <listId> is required')
  if (taskIds.length === 0) throw new Error('Provide at least one task ID')
  const client = new ClickUpClient(config)
  const outcomes = await runInBatches(taskIds, BULK_CONCURRENCY, async id => {
    await client.moveTaskToList(id, listId)
    return id
  })
  return toBulkResult(outcomes)
}
