import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

interface ArchiveOptions {
  confirm?: boolean
  unarchive?: boolean
}

interface ArchiveResult {
  taskId: string
  archived: boolean
}

export async function archiveTaskCommand(
  config: Config,
  taskId: string,
  opts: ArchiveOptions,
): Promise<ArchiveResult> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error(`Destructive operation requires --confirm flag in non-interactive mode`)
    }
    const task = await client.getTask(taskId)
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `${opts.unarchive ? 'Unarchive' : 'Archive'} task "${task.name}" (${task.id})?`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.updateTask(taskId, { archived: !opts.unarchive })
  return { taskId, archived: !opts.unarchive }
}
