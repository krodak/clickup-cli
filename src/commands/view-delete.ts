import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

export async function deleteViewCommand(
  config: Config,
  viewId: string,
  options: { confirm?: boolean },
): Promise<{ viewId: string; deleted: boolean }> {
  if (!isTTY() && !options.confirm) {
    throw new Error('Deleting a view requires --confirm flag in non-interactive mode')
  }

  if (isTTY() && !options.confirm) {
    const { confirm } = await import('@inquirer/prompts')
    const yes = await confirm({ message: `Delete view ${viewId}?`, default: false })
    if (!yes) throw new Error('Cancelled')
  }

  const client = new ClickUpClient(config)
  await client.deleteView(viewId)
  return { viewId, deleted: true }
}
