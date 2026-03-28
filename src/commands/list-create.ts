import type { ClickUpClient } from '../api.js'

export async function copyStatusesFrom(
  client: ClickUpClient,
  sourceId: string,
): Promise<Array<{ status: string; color: string; type: string }>> {
  try {
    const list = await client.getListWithStatuses(sourceId)
    return list.statuses.map(s => ({ status: s.status, color: s.color, type: s.type ?? 'custom' }))
  } catch {
    try {
      const space = await client.getSpaceWithStatuses(sourceId)
      return space.statuses.map(s => ({
        status: s.status,
        color: s.color,
        type: s.type ?? 'custom',
      }))
    } catch {
      throw new Error(
        `Could not find a list or space with ID "${sourceId}". Check the ID and try again.`,
      )
    }
  }
}
