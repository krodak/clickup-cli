import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface ListRenameResult {
  id: string
  name: string
}

export async function renameList(
  config: Config,
  listId: string,
  newName: string,
): Promise<ListRenameResult> {
  const client = new ClickUpClient(config)
  const result = await client.updateList(listId, { name: newName })
  return { id: result.id, name: result.name }
}
