import { describe, it, expect, beforeAll } from 'vitest'
import { ClickUpClient } from '../../src/api.js'
import { findActiveSprintList } from '../../src/commands/sprint.js'
import type { List } from '../../src/api.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('sprint detection e2e', () => {
  let client: ClickUpClient
  let teamId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
  })

  it('finds sprint folders in at least one space', async () => {
    const spaces = await client.getSpaces(teamId)
    let foundSprintFolder = false
    for (const space of spaces) {
      const folders = await client.getFolders(space.id)
      if (folders.some(f => f.name.toLowerCase().includes('sprint'))) {
        foundSprintFolder = true
        break
      }
    }
    expect(foundSprintFolder).toBe(true)
  })

  it('finds an active sprint list', async () => {
    const spaces = await client.getSpaces(teamId)
    const sprintLists: List[] = []

    // Stop as soon as we have sprint lists to avoid unnecessary API calls
    outer: for (const space of spaces) {
      const folders = await client.getFolders(space.id)
      const sprintFolders = folders.filter(f => f.name.toLowerCase().includes('sprint'))
      for (const folder of sprintFolders) {
        const lists = await client.getFolderLists(folder.id)
        sprintLists.push(...lists)
        if (sprintLists.length > 0) break outer
      }
    }

    expect(sprintLists.length).toBeGreaterThan(0)
    const active = findActiveSprintList(sprintLists)
    expect(active).not.toBeNull()
    expect(active!.name).toBeTypeOf('string')
  })
})
