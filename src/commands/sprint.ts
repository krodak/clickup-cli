import { ClickUpClient } from '../api.js'
import type { Task, List } from '../api.js'
import type { Config } from '../config.js'
import { printTasks } from './tasks.js'

export function parseSprintDates(name: string): { start: Date; end: Date } | null {
  // Match patterns like "(2/12 - 2/25)" or "(2/12-2/25)" with optional en-dash
  const m = name.match(/\((\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\)/)
  if (!m) return null
  const year = new Date().getFullYear()
  return {
    start: new Date(year, Number(m[1]) - 1, Number(m[2])),
    end: new Date(year, Number(m[3]) - 1, Number(m[4]), 23, 59, 59)
  }
}

export function findActiveSprintList(lists: List[], today = new Date()): List | null {
  if (lists.length === 0) return null

  // Try to find a list whose date range includes today
  for (const list of lists) {
    const dates = parseSprintDates(list.name)
    if (dates && today >= dates.start && today <= dates.end) {
      return list
    }
  }

  // Fallback: return last list in folder (most recent sprint)
  return lists[lists.length - 1]
}

function summarizeTasks(tasks: Task[], statusFilter?: string) {
  const filtered = statusFilter
    ? tasks.filter(t => t.status.status.toLowerCase() === statusFilter.toLowerCase())
    : tasks
  return filtered.map(t => ({
    id: t.id,
    name: t.name,
    status: t.status.status,
    task_type: (t.custom_item_id ?? 0) !== 0 ? 'initiative' : 'task',
    list: t.list.name,
    url: t.url,
    ...(t.parent ? { parent: t.parent } : {})
  }))
}

export async function runSprintCommand(
  config: Config,
  opts: { status?: string; json?: boolean; space?: string }
): Promise<void> {
  const client = new ClickUpClient(config)

  process.stderr.write('Detecting active sprint...\n')

  // Fetch all my tasks and all spaces in parallel
  const [myTasks, allSpaces] = await Promise.all([
    client.getMyTasks(config.teamId),
    client.getSpaces(config.teamId),
  ])

  // Determine which spaces to search
  let spaces = allSpaces
  if (opts.space) {
    // Explicit --space override: filter by partial name or exact ID
    spaces = allSpaces.filter(s =>
      s.name.toLowerCase().includes(opts.space!.toLowerCase()) ||
      s.id === opts.space
    )
    if (spaces.length === 0) {
      throw new Error(`No space matching "${opts.space}" found. Use \`cu spaces\` to list available spaces.`)
    }
  } else {
    // Auto-detect: only search spaces where I have assigned tasks
    const mySpaceIds = new Set(myTasks.map(t => t.space?.id).filter(Boolean))
    if (mySpaceIds.size > 0) {
      spaces = allSpaces.filter(s => mySpaceIds.has(s.id))
    }
  }

  // Fetch all folders in parallel across relevant spaces
  const foldersBySpace = await Promise.all(
    spaces.map(space => client.getFolders(space.id))
  )
  const sprintFolders = foldersBySpace.flat().filter(f => f.name.toLowerCase().includes('sprint'))

  // Fetch all sprint folder lists in parallel
  const listsByFolder = await Promise.all(
    sprintFolders.map(folder => client.getFolderLists(folder.id))
  )
  const sprintLists = listsByFolder.flat()

  const activeList = findActiveSprintList(sprintLists)

  if (!activeList) {
    throw new Error('No sprint list found. Ensure sprint folders contain "sprint" in their name.')
  }

  process.stderr.write(`Active sprint: ${activeList.name}\n`)

  // Filter already-fetched tasks to those in the active sprint list
  const sprintTasks = myTasks.filter(t => t.list.id === activeList.id)
  const summaries = summarizeTasks(sprintTasks, opts.status)

  await printTasks(summaries, opts.json ?? false)
}
