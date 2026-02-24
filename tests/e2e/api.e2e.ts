import { describe, it, expect, beforeAll } from 'vitest'
import { ClickUpClient } from '../../src/api.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('ClickUpClient e2e', () => {
  let client: ClickUpClient
  let teamId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    expect(teams.length).toBeGreaterThan(0)
    teamId = teams[0]!.id
  })

  it('getMe returns user with id and username', async () => {
    const me = await client.getMe()
    expect(me.id).toBeTypeOf('number')
    expect(me.username).toBeTypeOf('string')
    expect(me.username.length).toBeGreaterThan(0)
  })

  it('getTeams returns at least one team', async () => {
    const teams = await client.getTeams()
    expect(Array.isArray(teams)).toBe(true)
    expect(teams.length).toBeGreaterThan(0)
    expect(teams[0]!.id).toBeTypeOf('string')
    expect(teams[0]!.name).toBeTypeOf('string')
  })

  it('getMyTasks returns array', async () => {
    const tasks = await client.getMyTasks(teamId)
    expect(Array.isArray(tasks)).toBe(true)
  })

  it('getMyTasks returns tasks with expected fields', async () => {
    const tasks = await client.getMyTasks(teamId)
    if (tasks.length === 0) return
    const task = tasks[0]!
    expect(task.id).toBeTypeOf('string')
    expect(task.name).toBeTypeOf('string')
    expect(task.status).toBeDefined()
    expect(task.status.status).toBeTypeOf('string')
    expect(task.list).toBeDefined()
    expect(task.list.id).toBeTypeOf('string')
    expect(task.url).toBeTypeOf('string')
  })

  it('getMyTasks with status filter returns subset', async () => {
    const all = await client.getMyTasks(teamId)
    if (all.length === 0) return

    const firstStatus = all[0]!.status.status
    const filtered = await client.getMyTasks(teamId, { statuses: [firstStatus] })
    expect(filtered.length).toBeLessThanOrEqual(all.length)
    for (const t of filtered) {
      expect(t.status.status).toBe(firstStatus)
    }
  })

  it('getTask returns single task with full details', async () => {
    const tasks = await client.getMyTasks(teamId)
    if (tasks.length === 0) return
    const task = await client.getTask(tasks[0]!.id)
    expect(task.id).toBe(tasks[0]!.id)
    expect(task.name).toBeTypeOf('string')
  })

  it('getSpaces returns array with at least one space', async () => {
    const spaces = await client.getSpaces(teamId)
    expect(Array.isArray(spaces)).toBe(true)
    expect(spaces.length).toBeGreaterThan(0)
    expect(spaces[0]!.id).toBeTypeOf('string')
    expect(spaces[0]!.name).toBeTypeOf('string')
  })

  it('getMyTasks with listIds filter returns tasks from that list', async () => {
    const tasks = await client.getMyTasks(teamId)
    if (tasks.length === 0) return
    const listId = tasks[0]!.list.id
    const filtered = await client.getMyTasks(teamId, { listIds: [listId] })
    for (const t of filtered) {
      expect(t.list.id).toBe(listId)
    }
  })
})
