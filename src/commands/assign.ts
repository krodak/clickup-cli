import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { resolveAssigneeId } from './update.js'

interface AssignOptions {
  to?: string
  remove?: string
  json?: boolean
}

function parseIdList(value: string): string[] {
  return value
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0)
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
    for (const value of parseIdList(opts.to)) {
      add.push(await resolveAssigneeId(client, value))
    }
  }
  if (opts.remove) {
    for (const value of parseIdList(opts.remove)) {
      rem.push(await resolveAssigneeId(client, value))
    }
  }

  return client.updateTask(taskId, {
    assignees: {
      ...(add.length > 0 ? { add } : {}),
      ...(rem.length > 0 ? { rem } : {}),
    },
  })
}
