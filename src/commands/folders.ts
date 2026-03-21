import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

interface FolderWithLists {
  id: string
  name: string
  lists: Array<{ id: string; name: string }>
}

export async function listFolders(
  config: Config,
  spaceId: string,
  nameFilter?: string,
): Promise<FolderWithLists[]> {
  const client = new ClickUpClient(config)
  const folders = await client.getFolders(spaceId)
  let filtered = folders
  if (nameFilter) {
    const lower = nameFilter.toLowerCase()
    filtered = folders.filter(f => f.name.toLowerCase().includes(lower))
  }
  const results: FolderWithLists[] = []
  for (const folder of filtered) {
    const lists = await client.getFolderLists(folder.id)
    results.push({ id: folder.id, name: folder.name, lists })
  }
  return results
}

export function formatFolders(folders: FolderWithLists[]): string {
  if (folders.length === 0) return 'No folders found'
  return folders
    .map(f => {
      const header = `${chalk.bold(f.name)} ${chalk.dim(f.id)}`
      if (f.lists.length === 0) return header
      const listLines = f.lists.map(l => `  ${l.name} ${chalk.dim(l.id)}`)
      return [header, ...listLines].join('\n')
    })
    .join('\n\n')
}

export function formatFoldersMarkdown(folders: FolderWithLists[]): string {
  if (folders.length === 0) return 'No folders found'
  return folders
    .map(f => {
      const header = `- **${f.name}** (${f.id})`
      if (f.lists.length === 0) return header
      const listLines = f.lists.map(l => `  - ${l.name} (${l.id})`)
      return [header, ...listLines].join('\n')
    })
    .join('\n')
}
