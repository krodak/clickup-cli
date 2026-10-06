import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { applyListStatuses, copyStatusesFrom } from './list-statuses.js'

export { copyStatusesFrom }

export async function createListWithOptions(
  config: Config,
  spaceId: string,
  name: string,
  opts: { folder?: string; copyStatusesFrom?: string },
): Promise<{
  id: string
  name: string
  override_statuses?: boolean
  statuses?: Array<{ status: string; color: string; type: string }>
  statusesCopied?: number
}> {
  const client = new ClickUpClient(config)

  let statuses: Array<{ status: string; color: string; type: string }> | undefined
  if (opts.copyStatusesFrom) {
    statuses = await copyStatusesFrom(client, opts.copyStatusesFrom)
  }

  const list = opts.folder
    ? await client.createFolderList(opts.folder, name)
    : await client.createList(spaceId, name)

  if (!statuses) return list

  try {
    const applied = await applyListStatuses(client, list.id, statuses)
    return { ...list, override_statuses: true, statuses: applied, statusesCopied: applied.length }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`List "${name}" (${list.id}) was created but status copy failed: ${reason}`, {
      cause: err,
    })
  }
}
