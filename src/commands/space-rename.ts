import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface SpaceRenameResult {
  id: string
  name: string
}

export async function renameSpace(
  config: Config,
  spaceId: string,
  newName: string,
): Promise<SpaceRenameResult> {
  const client = new ClickUpClient(config)
  const result = await client.updateSpace(spaceId, { name: newName })
  return { id: result.id, name: result.name }
}
