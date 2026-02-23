import { checkbox } from '@inquirer/prompts'
import type { ClickUpClient } from '../api.js'

export interface ListChoice {
  teamName: string
  spaceName: string
  listId: string
  listName: string
}

export async function fetchAllLists(client: ClickUpClient): Promise<ListChoice[]> {
  const teams = await client.getTeams()

  const perTeam = await Promise.all(
    teams.map(async team => {
      const [spaces, assignedListIds] = await Promise.all([
        client.getSpaces(team.id),
        client.getAssignedListIds(team.id)
      ])
      const perSpace = await Promise.all(
        spaces.map(async space => {
          const [folderlessLists, folders] = await Promise.all([
            client.getLists(space.id),
            client.getFolders(space.id)
          ])

          const folderLists = await Promise.all(
            folders.map(folder => client.getFolderLists(folder.id))
          )

          const allLists = [...folderlessLists, ...folderLists.flat()]

          return allLists
            .filter(list => assignedListIds.has(list.id))
            .map(list => ({
              teamName: team.name,
              spaceName: space.name,
              listId: list.id,
              listName: list.name
            }))
        })
      )
      return perSpace.flat()
    })
  )

  return perTeam.flat()
}

export async function selectLists(client: ClickUpClient, currentListIds: string[]): Promise<string[]> {
  process.stderr.write('Fetching workspace lists...\n')
  const allLists = await fetchAllLists(client)

  if (allLists.length === 0) {
    throw new Error('No lists found in your ClickUp workspace.')
  }

  process.stderr.write(`Found ${allLists.length} list${allLists.length === 1 ? '' : 's'}. Use space to select, enter to confirm.\n`)

  const selected = await checkbox({
    message: 'Select lists to track (space to toggle, / to filter):',
    choices: allLists.map(l => ({
      name: `${l.teamName} / ${l.spaceName} / ${l.listName}`,
      value: l.listId,
      checked: currentListIds.includes(l.listId)
    })),
    pageSize: 20
  })

  if (selected.length === 0) {
    process.stderr.write('\nAvailable lists (copy IDs for manual config):\n')
    for (const l of allLists) {
      process.stderr.write(`  ${l.listId}  ${l.teamName} / ${l.spaceName} / ${l.listName}\n`)
    }
    process.stderr.write('\nManual config: add list IDs to ~/.config/cu/config.json\n')
    throw new Error('No lists selected. Select at least one with space before pressing enter.')
  }

  return selected
}
