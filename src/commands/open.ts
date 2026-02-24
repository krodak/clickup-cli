import { ClickUpClient } from '../api.js'
import type { Task } from '../api.js'
import type { Config } from '../config.js'
import { fetchMyTasks } from './tasks.js'
import { openUrl } from '../interactive.js'
import { isTTY } from '../output.js'

export interface OpenOptions {
  json?: boolean
}

function looksLikeTaskId(query: string): boolean {
  return /^[a-z0-9]+$/i.test(query) && query.length <= 12
}

export async function openTask(
  config: Config,
  query: string,
  opts: OpenOptions = {},
): Promise<Task> {
  const client = new ClickUpClient(config)

  if (looksLikeTaskId(query)) {
    let task: Task | undefined
    try {
      task = await client.getTask(query)
    } catch {
      // fall through to name search
    }

    if (task) {
      if (opts.json) {
        console.log(JSON.stringify(task, null, 2))
      } else {
        if (isTTY()) {
          console.log(task.name)
          console.log(task.url)
        }
        openUrl(task.url)
      }
      return task
    }
  }

  const tasks = await fetchMyTasks(config, { name: query })

  if (tasks.length === 0) {
    throw new Error(`No tasks found matching "${query}"`)
  }

  const first = tasks[0]!

  if (tasks.length > 1 && isTTY()) {
    console.log(`Found ${tasks.length} matches:`)
    for (const t of tasks) {
      console.log(`  ${t.id}  ${t.name}`)
    }
    console.log('Opening first match...')
  }

  if (opts.json) {
    const fullTask = await client.getTask(first.id)
    console.log(JSON.stringify(fullTask, null, 2))
    return fullTask
  }

  if (isTTY()) {
    console.log(first.name)
    console.log(first.url)
  }
  openUrl(first.url)

  return {
    id: first.id,
    name: first.name,
    status: { status: first.status, color: '' },
    assignees: [],
    url: first.url,
    list: { id: '', name: first.list },
    ...(first.parent ? { parent: first.parent } : {}),
  }
}
