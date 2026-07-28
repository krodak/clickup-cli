import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { matchStatus } from '../status.js'
import type { TaskSummary } from './tasks.js'
import { summarize, buildTypeMap } from './tasks.js'

export async function resolveSpaceNameToId(config: Config, value: string): Promise<string> {
  if (/^\d+$/.test(value)) {
    return value
  }

  const client = new ClickUpClient(config)
  const spaces = await client.getSpaces(config.teamId)
  const lower = value.toLowerCase()
  const matches = spaces.filter(s => s.name.toLowerCase().includes(lower))

  if (matches.length === 1) {
    process.stderr.write(`Space matched: "${value}" -> "${matches[0]!.name}" (${matches[0]!.id})\n`)
    return matches[0]!.id
  }

  if (matches.length > 1) {
    const list = matches.map(s => `  - "${s.name}" (${s.id})`).join('\n')
    throw new Error(`Multiple spaces match "${value}":\n${list}\nSpecify the space ID directly.`)
  }

  const available = spaces.map(s => `  - "${s.name}" (${s.id})`).join('\n')
  throw new Error(`No space matching "${value}" found. Available spaces:\n${available}`)
}

export interface SearchOptions {
  status?: string
  all?: boolean
  includeClosed?: boolean
  listIds?: string[]
  spaceIds?: string[]
  assignees?: number[]
  tags?: string[]
  dueDateGt?: number
  dueDateLt?: number
  dateCreatedGt?: number
  dateCreatedLt?: number
  customFields?: Array<{ field_id: string; operator: string; value?: unknown }>
}

export async function searchTasks(
  config: Config,
  query: string | undefined,
  opts: SearchOptions = {},
): Promise<TaskSummary[]> {
  const trimmed = (query ?? '').trim()

  const client = new ClickUpClient(config)
  const [allTasks, customTypes] = await Promise.all([
    client.getMyTasks(config.teamId, {
      all: opts.all,
      includeClosed: opts.includeClosed,
      listIds: opts.listIds,
      spaceIds: opts.spaceIds,
      assignees: opts.assignees,
      tags: opts.tags,
      dueDateGt: opts.dueDateGt,
      dueDateLt: opts.dueDateLt,
      dateCreatedGt: opts.dateCreatedGt,
      dateCreatedLt: opts.dateCreatedLt,
      customFields: opts.customFields,
    }),
    client.getCustomTaskTypes(config.teamId),
  ])
  const typeMap = buildTypeMap(customTypes)

  let matched = allTasks
  if (trimmed) {
    const words = trimmed.toLowerCase().split(/\s+/)
    matched = allTasks.filter(task => {
      const name = task.name.toLowerCase()
      return words.every(word => name.includes(word))
    })
  }

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

  return matched.map(t => summarize(t, typeMap))
}
