import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

interface FolderDeleteOptions {
  confirm?: boolean
}

interface FolderDeleteResult {
  folderId: string
  deleted: boolean
}

export async function deleteFolderCommand(
  config: Config,
  folderId: string,
  opts: FolderDeleteOptions,
): Promise<FolderDeleteResult> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
    }
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `Delete folder ${folderId}? This cannot be undone.`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.deleteFolder(folderId)
  return { folderId, deleted: true }
}
