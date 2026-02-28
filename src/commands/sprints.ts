import { ClickUpClient } from '../api.js'
import type { List, Space } from '../api.js'
import type { Config } from '../config.js'
import { parseSprintDates, findRelatedSpaces } from './sprint.js'
import { formatTable, isTTY } from '../output.js'
import type { Column } from '../output.js'

export interface SprintInfo {
  id: string
  name: string
  folder: string
  start: string | null
  end: string | null
  active: boolean
}

interface SprintRow {
  id: string
  sprint: string
  dates: string
}

const SPRINT_COLUMNS: Column<SprintRow>[] = [
  { key: 'id', label: 'ID' },
  { key: 'sprint', label: 'SPRINT', maxWidth: 60 },
  { key: 'dates', label: 'DATES' },
]

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function buildSprintInfos(lists: List[], folderName: string, today: Date): SprintInfo[] {
  return lists.map(list => {
    const dates = parseSprintDates(list.name)
    const active = dates !== null && today >= dates.start && today <= dates.end
    return {
      id: list.id,
      name: list.name,
      folder: folderName,
      start: dates ? dates.start.toISOString() : null,
      end: dates ? dates.end.toISOString() : null,
      active,
    }
  })
}

export async function listSprints(
  config: Config,
  opts: { json?: boolean; space?: string } = {},
): Promise<void> {
  const client = new ClickUpClient(config)

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
    const mySpaceIds = new Set(
      myTasks.map(t => t.space?.id).filter((id): id is string => Boolean(id)),
    )
    spaces = findRelatedSpaces(mySpaceIds, allSpaces)
  }

  const foldersBySpace = await Promise.all(spaces.map(space => client.getFolders(space.id)))
  const sprintFolders = foldersBySpace.flat().filter(f => f.name.toLowerCase().includes('sprint'))

  const today = new Date()
  const allSprints: SprintInfo[] = []

  const listsByFolder = await Promise.all(
    sprintFolders.map(folder => client.getFolderLists(folder.id)),
  )
  for (let i = 0; i < sprintFolders.length; i++) {
    const folder = sprintFolders[i]!
    const lists = listsByFolder[i]!
    allSprints.push(...buildSprintInfos(lists, folder.name, today))
  }

  if (opts.json || !isTTY()) {
    console.log(JSON.stringify(allSprints, null, 2))
    return
  }

  if (allSprints.length === 0) {
    console.log('No sprints found.')
    return
  }

  const rows: SprintRow[] = allSprints.map(s => {
    const dates = parseSprintDates(s.name)
    const dateStr = dates ? `${formatDate(dates.start)} - ${formatDate(dates.end)}` : ''
    return {
      id: s.id,
      sprint: s.active ? `* ${s.name}` : s.name,
      dates: dateStr,
    }
  })

  console.log(formatTable(rows, SPRINT_COLUMNS))
}
