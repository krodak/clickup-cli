import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

interface SpaceDeleteOptions {
  confirm?: boolean
}

interface SpaceDeleteResult {
  spaceId: string
  deleted: boolean
}

export async function deleteSpaceCommand(
  config: Config,
  spaceId: string,
  opts: SpaceDeleteOptions,
): Promise<SpaceDeleteResult> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
    }
    const space = await client.getSpaceWithStatuses(spaceId)
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `Delete space "${space.name}" (${spaceId})? This cannot be undone.`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.deleteSpace(spaceId)
  return { spaceId, deleted: true }
}
