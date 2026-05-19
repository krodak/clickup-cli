import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

interface ListDeleteOptions {
  confirm?: boolean
}

interface ListDeleteResult {
  listId: string
  deleted: boolean
}

export async function deleteListCommand(
  config: Config,
  listId: string,
  opts: ListDeleteOptions,
): Promise<ListDeleteResult> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
    }
    const list = await client.getListWithStatuses(listId)
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `Delete list "${list.name}" (${listId})? This cannot be undone.`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.deleteList(listId)
  return { listId, deleted: true }
}
