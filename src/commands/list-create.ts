import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function createListWithOptions(
  config: Config,
  spaceId: string,
  name: string,
  opts: { folder?: string; copyStatusesFrom?: string },
): Promise<{ id: string; name: string; statusesCopied?: number }> {
  const client = new ClickUpClient(config)

  let statuses: Array<{ status: string; color: string; type: string }> | undefined
  if (opts.copyStatusesFrom) {
    statuses = await copyStatusesFrom(client, opts.copyStatusesFrom)
  }

  const list = opts.folder
    ? await client.createFolderList(opts.folder, name)
    : await client.createList(spaceId, name)

  if (statuses) {
    await client.updateList(list.id, { statuses })
  }

  return {
    ...list,
    ...(statuses ? { statusesCopied: statuses.length } : {}),
  }
}

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
