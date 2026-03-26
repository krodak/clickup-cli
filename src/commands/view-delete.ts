import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

interface ViewDeleteOptions {
  confirm?: boolean
}

interface ViewDeleteResult {
  viewId: string
  deleted: boolean
}

export async function deleteViewCommand(
  config: Config,
  viewId: string,
  opts: ViewDeleteOptions,
): Promise<ViewDeleteResult> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
    }
    const view = await client.getView(viewId)
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `Delete view "${view.name}" (${viewId})? This cannot be undone.`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.deleteView(viewId)
  return { viewId, deleted: true }
}
