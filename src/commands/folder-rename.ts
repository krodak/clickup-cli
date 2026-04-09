import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface FolderRenameResult {
  id: string
  name: string
}

export async function renameFolder(
  config: Config,
  folderId: string,
  newName: string,
): Promise<FolderRenameResult> {
  const client = new ClickUpClient(config)
  const result = await client.updateFolder(folderId, { name: newName })
  return { id: result.id, name: result.name }
}
