import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function bulkUpdateStatus(
  config: Config,
  taskIds: string[],
  status: string,
): Promise<{ updated: number; failed: string[] }> {
  const client = new ClickUpClient(config)
  const failed: string[] = []
  for (const id of taskIds) {
    try {
      await client.updateTask(id, { status })
    } catch {
      failed.push(id)
    }
  }
  return { updated: taskIds.length - failed.length, failed }
}
