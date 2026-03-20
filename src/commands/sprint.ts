import { select } from '@inquirer/prompts'
import { ClickUpClient } from '../api.js'
import type { Task, List, Space } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'
import { printTasks, summarize, isDoneStatus, buildTypeMap } from './tasks.js'

export const SPRINT_KEYWORDS = ['sprint', 'iteration', 'cycle', 'scrum']

function parseUSDateRange(name: string): { start: Date; end: Date } | null {
  const m = name.match(/\((\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\)/)
  if (!m) return null
  const year = new Date().getFullYear()
  const start = new Date(year, Number(m[1]) - 1, Number(m[2]))
  const end = new Date(year, Number(m[3]) - 1, Number(m[4]), 23, 59, 59)
  if (end < start) end.setFullYear(end.getFullYear() + 1)
  return { start, end }
}

function parseISODateRange(name: string): { start: Date; end: Date } | null {
  const m = name.match(/\((\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})\)/)
  if (!m) return null
  const [sy, sm, sd] = m[1]!.split('-').map(Number)
  const [ey, em, ed] = m[2]!.split('-').map(Number)
  const start = new Date(sy!, sm! - 1, sd)
  const end = new Date(ey!, em! - 1, ed, 23, 59, 59)
  return { start, end }
}

function parseMonthDayRange(name: string): { start: Date; end: Date } | null {
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }
  const m = name.match(/\(([A-Za-z]{3})\s+(\d{1,2})\s*[-–]\s*([A-Za-z]{3})\s+(\d{1,2})\)/)
  if (!m) return null
  const sm = months[m[1]!.toLowerCase()]
  const em = months[m[3]!.toLowerCase()]
  if (sm === undefined || em === undefined) return null
  const year = new Date().getFullYear()
  const start = new Date(year, sm, Number(m[2]))
  const end = new Date(year, em, Number(m[4]), 23, 59, 59)
  if (end < start) end.setFullYear(end.getFullYear() + 1)
  return { start, end }
}

function parseEuropeanDateRange(name: string): { start: Date; end: Date } | null {
  const m = name.match(/\((\d{1,2})\.(\d{1,2})\s*[-–]\s*(\d{1,2})\.(\d{1,2})\)/)
  if (!m) return null
  const year = new Date().getFullYear()
  const start = new Date(year, Number(m[2]) - 1, Number(m[1]))
  const end = new Date(year, Number(m[4]) - 1, Number(m[3]), 23, 59, 59)
  if (end < start) end.setFullYear(end.getFullYear() + 1)
  return { start, end }
}

export function parseSprintDates(name: string): { start: Date; end: Date } | null {
  return (
    parseUSDateRange(name) ??
    parseISODateRange(name) ??
    parseMonthDayRange(name) ??
    parseEuropeanDateRange(name)
  )
}

export function findActiveSprintList(lists: List[], today = new Date()): List | null {
  if (lists.length === 0) return null

  for (const list of lists) {
    const dates = parseSprintDates(list.name)
    if (dates && today >= dates.start && today <= dates.end) return list
  }

  for (const list of lists) {
    if (list.start_date && list.due_date) {
      const start = new Date(Number(list.start_date))
      const end = new Date(Number(list.due_date))
      if (today >= start && today <= end) return list
    }
  }

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
  opts: {
    status?: string
    json?: boolean
    space?: string
    includeClosed?: boolean
    folder?: string
  },
): Promise<void> {
  const client = new ClickUpClient(config)

  process.stderr.write('Detecting active sprint...\n')

  const folderId = opts.folder ?? config.sprintFolderId

  const [myTasks, allSpaces, customTypes] = await Promise.all([
    client.getMyTasks(config.teamId),
    folderId ? Promise.resolve([]) : client.getSpaces(config.teamId),
    client.getCustomTaskTypes(config.teamId),
  ])
  const typeMap = buildTypeMap(customTypes)

  let sprintLists: List[]

  if (folderId) {
    sprintLists = await client.getFolderLists(folderId)
  } else {
    let spaces: Space[]
    if (opts.space) {
      spaces = allSpaces.filter(
        s => s.name.toLowerCase().includes(opts.space!.toLowerCase()) || s.id === opts.space,
      )
      if (spaces.length === 0) {
        throw new Error(
          `No space matching "${opts.space}" found. Use \`cup spaces\` to list available spaces.`,
        )
      }
    } else {
      const mySpaceIds = new Set(
        myTasks.map(t => t.space?.id).filter((id): id is string => Boolean(id)),
      )
      spaces = findRelatedSpaces(mySpaceIds, allSpaces)
    }

    const foldersBySpace = await Promise.all(spaces.map(space => client.getFolders(space.id)))
    const sprintFolders = foldersBySpace.flat().filter(f => {
      const lower = f.name.toLowerCase()
      return SPRINT_KEYWORDS.some(kw => lower.includes(kw))
    })

    const listsByFolder = await Promise.all(
      sprintFolders.map(folder => client.getFolderLists(folder.id)),
    )
    sprintLists = listsByFolder.flat()
  }

  let activeList = findActiveSprintList(sprintLists)

  if (!activeList && sprintLists.length > 1 && isTTY()) {
    const choice = await select({
      message: 'Multiple sprint lists found. Which one?',
      choices: sprintLists.map(l => ({
        name: `${l.name} (${l.id})`,
        value: l,
      })),
    })
    activeList = choice
  }

  if (!activeList && sprintLists.length > 1) {
    process.stderr.write(
      `Multiple sprint lists found:\n${sprintLists.map(l => `  - ${l.name} (${l.id})`).join('\n')}\nUsing: ${sprintLists[sprintLists.length - 1]!.name}\n`,
    )
    activeList = sprintLists[sprintLists.length - 1] ?? null
  }

  if (!activeList) {
    throw new Error(
      'No sprint list found. Ensure sprint folders contain "sprint", "iteration", "cycle", or "scrum" in their name.',
    )
  }

  process.stderr.write(`Active sprint: ${activeList.name}\n`)

  const me = await client.getMe()
  const viewData = await client.getListViews(activeList.id)
  const listView = viewData.required_views?.list

  let allTasks: Task[]
  if (listView) {
    allTasks = await client.getViewTasks(listView.id)
  } else {
    allTasks = await client.getTasksFromList(activeList.id)
  }

  let sprintTasks = allTasks.filter(t => t.assignees.some(a => Number(a.id) === me.id))

  if (!opts.includeClosed) {
    sprintTasks = sprintTasks.filter(t => !isDoneStatus(t.status.status))
  }

  const filtered = opts.status
    ? sprintTasks.filter(t => t.status.status.toLowerCase() === opts.status!.toLowerCase())
    : sprintTasks
  const summaries = filtered.map(t => summarize(t, typeMap))

  await printTasks(summaries, opts.json ?? false, config)
}
