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
      const spaces = await client.getSpaces(team.id)
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

          return allLists.map(list => ({
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
  const allLists = await fetchAllLists(client)

  if (allLists.length === 0) {
    throw new Error('No lists found in your ClickUp workspace.')
  }

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
    throw new Error('No lists selected.')
  }

  return selected
}
