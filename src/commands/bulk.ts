import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { resolveAssigneeId, parseDueDate } from './update.js'

export type BulkResult = { updated: number; failed: Array<{ id: string; reason: string }> }

export async function bulkUpdateStatus(
  config: Config,
  taskIds: string[],
  status: string,
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const failed: Array<{ id: string; reason: string }> = []
  for (const id of taskIds) {
    try {
      await client.updateTask(id, { status })
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err)
      failed.push({ id, reason })
    }
  }
  return { updated: taskIds.length - failed.length, failed }
}

export async function bulkAssign(
  config: Config,
  userIdOrMe: string,
  taskIds: string[],
  action: 'add' | 'remove',
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const numericId = await resolveAssigneeId(client, userIdOrMe)
  const failed: Array<{ id: string; reason: string }> = []
  for (const id of taskIds) {
    try {
      await client.updateTask(id, {
        assignees: action === 'add' ? { add: [numericId] } : { rem: [numericId] },
      })
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err)
      failed.push({ id, reason })
    }
  }
  return { updated: taskIds.length - failed.length, failed }
}

export async function bulkDueDate(
  config: Config,
  date: string,
  taskIds: string[],
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const payload =
    date === 'none' || date === 'clear'
      ? { due_date: null }
      : { due_date: parseDueDate(date), due_date_time: false }
  const failed: Array<{ id: string; reason: string }> = []
  for (const id of taskIds) {
    try {
      await client.updateTask(id, payload)
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err)
      failed.push({ id, reason })
    }
  }
  return { updated: taskIds.length - failed.length, failed }
}

export async function bulkTag(
  config: Config,
  tagName: string,
  taskIds: string[],
  action: 'add' | 'remove',
): Promise<BulkResult> {
  const client = new ClickUpClient(config)
  const failed: Array<{ id: string; reason: string }> = []
  for (const id of taskIds) {
    try {
      if (action === 'add') {
        await client.addTagToTask(id, tagName)
      } else {
        await client.removeTagFromTask(id, tagName)
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err)
      failed.push({ id, reason })
    }
  }
  return { updated: taskIds.length - failed.length, failed }
}
