import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface MoveOptions {
  to?: string
  remove?: string
}

export async function moveTask(config: Config, taskId: string, opts: MoveOptions): Promise<string> {
  if (!opts.to && !opts.remove) {
    throw new Error('Provide --to <listId> or --remove <listId>')
  }

  const client = new ClickUpClient(config)
  const messages: string[] = []

  if (opts.to) {
    await client.addTaskToList(taskId, opts.to)
    messages.push(`Added ${taskId} to list ${opts.to}`)
  }

  if (opts.remove) {
    await client.removeTaskFromList(taskId, opts.remove)
    messages.push(`Removed ${taskId} from list ${opts.remove}`)
  }

  return messages.join('; ')
}
