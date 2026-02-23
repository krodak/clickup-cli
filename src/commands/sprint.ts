import { ClickUpClient } from '../api.js'
import type { List } from '../api.js'
import type { Config } from '../config.js'
import { fetchMyTasks, printTasks } from './tasks.js'

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

export async function runSprintCommand(
  config: Config,
  opts: { status?: string; json?: boolean }
): Promise<void> {
  const client = new ClickUpClient(config)

  process.stderr.write('Detecting active sprint...\n')

  const spaces = await client.getSpaces(config.teamId)

  // Fetch all folders in parallel across all spaces
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

  const tasks = await fetchMyTasks(config, {
    listIds: [activeList.id],
    statuses: opts.status ? [opts.status] : undefined,
  })

  printTasks(tasks, opts.json ?? false)
}
