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
    try {
      await client.updateList(list.id, { statuses })
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      throw new Error(`List "${name}" (${list.id}) was created but status copy failed: ${reason}`, {
        cause: err,
      })
    }
  }

  return {
    ...list,
    ...(statuses ? { statusesCopied: statuses.length } : {}),
  }
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && /ClickUp API error 4(04|03)/.test(err.message)
}

export async function copyStatusesFrom(
  client: ClickUpClient,
  sourceId: string,
): Promise<Array<{ status: string; color: string; type: string }>> {
  try {
    const list = await client.getListWithStatuses(sourceId)
    return list.statuses.map(s => ({ status: s.status, color: s.color, type: s.type ?? 'custom' }))
  } catch (err) {
    if (!isNotFound(err)) throw err
    try {
      const space = await client.getSpaceWithStatuses(sourceId)
      return space.statuses.map(s => ({
        status: s.status,
        color: s.color,
        type: s.type ?? 'custom',
      }))
    } catch (spaceErr) {
      if (!isNotFound(spaceErr)) throw spaceErr
      throw new Error(
        `Could not find a list or space with ID "${sourceId}". Check the ID and try again.`,
        { cause: spaceErr },
      )
    }
  }
}
