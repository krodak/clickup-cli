import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

interface DeleteOptions {
  confirm?: boolean
}

interface DeleteResult {
  taskId: string
  deleted: boolean
}

export async function deleteTaskCommand(
  config: Config,
  taskId: string,
  opts: DeleteOptions,
): Promise<DeleteResult> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
    }
    const task = await client.getTask(taskId)
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `Delete task "${task.name}" (${task.id})? This cannot be undone.`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.deleteTask(taskId)
  return { taskId, deleted: true }
}
