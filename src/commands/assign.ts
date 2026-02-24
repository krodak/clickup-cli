import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { parseAssigneeId } from './update.js'

export interface AssignOptions {
  to?: string
  remove?: string
  json?: boolean
}

async function resolveUserId(client: ClickUpClient, value: string): Promise<number> {
  if (value === 'me') {
    const user = await client.getMe()
    return user.id
  }
  return parseAssigneeId(value)
}

export async function assignTask(
  config: Config,
  taskId: string,
  opts: AssignOptions,
): Promise<Task> {
  if (!opts.to && !opts.remove) {
    throw new Error('Provide at least one of: --to, --remove')
  }

  const client = new ClickUpClient(config)

  const add: number[] = []
  const rem: number[] = []

  if (opts.to) {
    add.push(await resolveUserId(client, opts.to))
  }
  if (opts.remove) {
    rem.push(await resolveUserId(client, opts.remove))
  }

  return client.updateTask(taskId, {
    assignees: {
      ...(add.length > 0 ? { add } : {}),
      ...(rem.length > 0 ? { rem } : {}),
    },
  })
}
