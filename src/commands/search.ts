import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
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
    const statusLower = opts.status.toLowerCase()
    matched = matched.filter(t => t.status.status.toLowerCase() === statusLower)
  }

  return matched.map(summarize)
}
