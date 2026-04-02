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

  it('getFolders returns folders for E2E Tests space', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    expect(testSpace).toBeDefined()
    const folders = await client.getFolders(testSpace!.id)
    expect(Array.isArray(folders)).toBe(true)
    expect(folders.length).toBeGreaterThan(0)
    expect(folders[0]!.id).toBeTypeOf('string')
  })

  it('getLists returns lists for E2E Tests space', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    expect(testSpace).toBeDefined()
    const lists = await client.getLists(testSpace!.id)
    expect(Array.isArray(lists)).toBe(true)
    expect(lists.length).toBeGreaterThan(0)
    expect(lists[0]!.id).toBeTypeOf('string')
    expect(lists[0]!.name).toBeTypeOf('string')
  })

  it('getListViews returns views for a list', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    const lists = await client.getLists(testSpace!.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    expect(backlog).toBeDefined()
    const data = await client.getListViews(backlog!.id)
    expect(data).toBeDefined()
  })

  it('getWorkspaceMembers returns members', async () => {
    const members = await client.getWorkspaceMembers(teamId)
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBeGreaterThan(0)
  })

  it('getSpaceTags returns tags for E2E Tests space', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    expect(testSpace).toBeDefined()
    const tags = await client.getSpaceTags(testSpace!.id)
    expect(Array.isArray(tags)).toBe(true)
  })

  it('getCustomTaskTypes returns array', async () => {
    const types = await client.getCustomTaskTypes(teamId)
    expect(Array.isArray(types)).toBe(true)
  })

  it('getGoals returns array', async () => {
    const goals = await client.getGoals(teamId)
    expect(Array.isArray(goals)).toBe(true)
  })

  it('getDocs returns array', async () => {
    const docs = await client.getDocs(teamId)
    expect(Array.isArray(docs)).toBe(true)
  })

  it('getTasksFromList returns tasks', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    const lists = await client.getLists(testSpace!.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    expect(backlog).toBeDefined()
    const tasks = await client.getTasksFromList(backlog!.id)
    expect(Array.isArray(tasks)).toBe(true)
  })

  it('getListCustomFields returns array', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    const lists = await client.getLists(testSpace!.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    expect(backlog).toBeDefined()
    const fields = await client.getListCustomFields(backlog!.id)
    expect(Array.isArray(fields)).toBe(true)
  })

  it('getSpaceViews returns views for E2E Tests space', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    expect(testSpace).toBeDefined()
    const views = await client.getSpaceViews(testSpace!.id)
    expect(Array.isArray(views)).toBe(true)
  })

  it('getFolderViews returns views for a folder', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    expect(testSpace).toBeDefined()
    const folders = await client.getFolders(testSpace!.id)
    if (folders.length === 0) return
    const views = await client.getFolderViews(folders[0]!.id)
    expect(Array.isArray(views)).toBe(true)
  })

  it('getWorkspaceViews returns views for the workspace', async () => {
    const views = await client.getWorkspaceViews(teamId)
    expect(Array.isArray(views)).toBe(true)
  })

  it('getSpaceWithStatuses returns space with statuses array', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    expect(testSpace).toBeDefined()
    const space = await client.getSpaceWithStatuses(testSpace!.id)
    expect(space.id).toBe(testSpace!.id)
    expect(Array.isArray(space.statuses)).toBe(true)
  })

  it('getListWithStatuses returns list with statuses array', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    const lists = await client.getLists(testSpace!.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    expect(backlog).toBeDefined()
    const list = await client.getListWithStatuses(backlog!.id)
    expect(list.id).toBe(backlog!.id)
    expect(Array.isArray(list.statuses)).toBe(true)
  })

  it('getTaskTemplates returns array', async () => {
    try {
      const templates = await client.getTaskTemplates(teamId)
      expect(Array.isArray(templates)).toBe(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      expect(msg).toMatch(/500/)
    }
  })

  it('getListTemplates returns array', async () => {
    const templates = await client.getListTemplates(teamId)
    expect(Array.isArray(templates)).toBe(true)
  })

  it('getFolderTemplates returns array', async () => {
    const templates = await client.getFolderTemplates(teamId)
    expect(Array.isArray(templates)).toBe(true)
  })

  it('getUserTimezone returns string or undefined', async () => {
    const tz = await client.getUserTimezone()
    if (tz !== undefined) {
      expect(tz).toBeTypeOf('string')
    }
  })

  it('getTimeInStatus returns status history', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    const lists = await client.getLists(testSpace!.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    expect(backlog).toBeDefined()
    const tasks = await client.getTasksFromList(backlog!.id)
    if (tasks.length === 0) return
    try {
      const result = await client.getTimeInStatus(tasks[0]!.id)
      expect(result).toBeDefined()
      expect(result.current_status).toBeDefined()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      expect(msg).toMatch(/time.in.status/i)
    }
  })

  it('getViewTasks returns tasks from a view', async () => {
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    const lists = await client.getLists(testSpace!.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    expect(backlog).toBeDefined()
    const viewData = await client.getListViews(backlog!.id)
    if (!viewData.views || viewData.views.length === 0) return
    const tasks = await client.getViewTasks(viewData.views[0]!.id)
    expect(Array.isArray(tasks)).toBe(true)
  })
})
