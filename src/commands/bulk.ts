import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function bulkUpdateStatus(
  config: Config,
  taskIds: string[],
  status: string,
): Promise<{ updated: number; failed: Array<{ id: string; reason: string }> }> {
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
