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

  const allSpaces = await client.getSpaces(config.teamId)

  let spaces = allSpaces
  if (opts.space) {
    spaces = allSpaces.filter(s =>
      s.name.toLowerCase().includes(opts.space!.toLowerCase()) ||
      s.id === opts.space
    )
    if (spaces.length === 0) {
      throw new Error(`No space matching "${opts.space}" found. Use \`cu spaces\` to list available spaces.`)
    }
  }

  const foldersBySpace = await Promise.all(
    spaces.map(space => client.getFolders(space.id))
  )
  const sprintFolders = foldersBySpace.flat().filter(f => f.name.toLowerCase().includes('sprint'))

  const listsByFolder = await Promise.all(
    sprintFolders.map(folder => client.getFolderLists(folder.id))
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

  const summaries = summarizeTasks(sprintTasks, opts.status)

  await printTasks(summaries, opts.json ?? false)
}
