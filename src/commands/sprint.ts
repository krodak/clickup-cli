import { ClickUpClient } from '../api.js'
import type { Task, List, Space } from '../api.js'
import type { Config } from '../config.js'
import { printTasks, summarize } from './tasks.js'

export function parseSprintDates(name: string): { start: Date; end: Date } | null {
  // Match patterns like "(2/12 - 2/25)" or "(2/12-2/25)" with optional en-dash
  const m = name.match(/\((\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\)/)
  if (!m) return null
  const year = new Date().getFullYear()
  const start = new Date(year, Number(m[1]) - 1, Number(m[2]))
  const end = new Date(year, Number(m[3]) - 1, Number(m[4]), 23, 59, 59)
  if (end < start) {
    end.setFullYear(end.getFullYear() + 1)
  }
  return { start, end }
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
  return lists[lists.length - 1] ?? null
}

const NOISE_WORDS = new Set(['product', 'team', 'the', 'and', 'for', 'test'])

export function extractSpaceKeywords(spaceName: string): string[] {
  return spaceName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length >= 3 && !NOISE_WORDS.has(w))
}

export function findRelatedSpaces(mySpaceIds: Set<string>, allSpaces: Space[]): Space[] {
  const mySpaces = allSpaces.filter(s => mySpaceIds.has(s.id))
  const keywords = mySpaces.flatMap(s => extractSpaceKeywords(s.name))
  if (keywords.length === 0) return allSpaces

  return allSpaces.filter(
    s => mySpaceIds.has(s.id) || keywords.some(kw => s.name.toLowerCase().includes(kw)),
  )
}

export async function runSprintCommand(
  config: Config,
  opts: { status?: string; json?: boolean; space?: string },
): Promise<void> {
  const client = new ClickUpClient(config)

  process.stderr.write('Detecting active sprint...\n')

  const [myTasks, allSpaces] = await Promise.all([
    client.getMyTasks(config.teamId),
    client.getSpaces(config.teamId),
  ])

  let spaces: Space[]
  if (opts.space) {
    spaces = allSpaces.filter(
      s => s.name.toLowerCase().includes(opts.space!.toLowerCase()) || s.id === opts.space,
    )
    if (spaces.length === 0) {
      throw new Error(
        `No space matching "${opts.space}" found. Use \`cu spaces\` to list available spaces.`,
      )
    }
  } else {
    const mySpaceIds = new Set(myTasks.map(t => t.space?.id).filter(Boolean) as string[])
    spaces = findRelatedSpaces(mySpaceIds, allSpaces)
  }

  const foldersBySpace = await Promise.all(spaces.map(space => client.getFolders(space.id)))
  const sprintFolders = foldersBySpace.flat().filter(f => f.name.toLowerCase().includes('sprint'))

  const listsByFolder = await Promise.all(
    sprintFolders.map(folder => client.getFolderLists(folder.id)),
  )
  const sprintLists = listsByFolder.flat()

  const activeList = findActiveSprintList(sprintLists)

  if (!activeList) {
    throw new Error('No sprint list found. Ensure sprint folders contain "sprint" in their name.')
  }

  process.stderr.write(`Active sprint: ${activeList.name}\n`)

  const me = await client.getMe()
  const viewData = await client.getListViews(activeList.id)
  const listView = viewData.required_views?.list
  let sprintTasks: Task[]

  if (listView) {
    const allViewTasks = await client.getViewTasks(listView.id)
    sprintTasks = allViewTasks.filter(t => t.assignees.some(a => a.id === me.id))
  } else {
    sprintTasks = await client.getMyTasksFromList(activeList.id)
  }

  const filtered = opts.status
    ? sprintTasks.filter(t => t.status.status.toLowerCase() === opts.status!.toLowerCase())
    : sprintTasks
  const summaries = filtered.map(summarize)

  await printTasks(summaries, opts.json ?? false, config)
}
