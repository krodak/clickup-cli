import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY, formatTable } from '../output.js'

export interface ListSummary {
  id: string
  name: string
  folder: string
}

export async function fetchLists(
  config: Config,
  spaceId: string,
  opts: { name?: string } = {},
): Promise<ListSummary[]> {
  const client = new ClickUpClient(config)
  const results: ListSummary[] = []

  const folderlessLists = await client.getLists(spaceId)
  for (const list of folderlessLists) {
    results.push({ id: list.id, name: list.name, folder: '(none)' })
  }

  const folders = await client.getFolders(spaceId)
  for (const folder of folders) {
    const folderLists = await client.getFolderLists(folder.id)
    for (const list of folderLists) {
      results.push({ id: list.id, name: list.name, folder: folder.name })
    }
  }

  if (opts.name) {
    const query = opts.name.toLowerCase()
    return results.filter(l => l.name.toLowerCase().includes(query))
  }

  return results
}

export function printLists(lists: ListSummary[], forceJson: boolean): void {
  if (forceJson || !isTTY()) {
    console.log(JSON.stringify(lists, null, 2))
    return
  }

  if (lists.length === 0) {
    console.log('No lists found.')
    return
  }

  const table = formatTable(lists, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'NAME', maxWidth: 50 },
    { key: 'folder', label: 'FOLDER', maxWidth: 30 },
  ])
  console.log(table)
}
