import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { matchStatus } from '../status.js'
import type { TaskSummary } from './tasks.js'
import { summarize } from './tasks.js'

export interface SearchOptions {
  status?: string
}

export async function searchTasks(
  config: Config,
  query: string,
  opts: SearchOptions = {},
): Promise<TaskSummary[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    throw new Error('Search query cannot be empty')
  }

  const client = new ClickUpClient(config)
  const allTasks = await client.getMyTasks(config.teamId)

  const words = trimmed.toLowerCase().split(/\s+/)

  let matched = allTasks.filter(task => {
    const name = task.name.toLowerCase()
    return words.every(word => name.includes(word))
  })

  if (opts.status) {
    const availableStatuses = [...new Set(allTasks.map(t => t.status.status))]
    const resolved = matchStatus(opts.status, availableStatuses)
    if (resolved) {
      if (resolved.toLowerCase() !== opts.status.toLowerCase()) {
        process.stderr.write(`Status matched: "${opts.status}" -> "${resolved}"\n`)
      }
      matched = matched.filter(t => t.status.status.toLowerCase() === resolved.toLowerCase())
    } else {
      matched = matched.filter(t => t.status.status.toLowerCase() === opts.status!.toLowerCase())
    }
  }

  return matched.map(summarize)
}
