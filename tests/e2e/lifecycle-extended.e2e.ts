import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../../src/api.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('Dependency lifecycle e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskAId: string
  let taskBId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found')
    listId = backlog.id
    const [a, b] = await Promise.all([
      client.createTask(listId, { name: 'E2E Dep Task A' }),
      client.createTask(listId, { name: 'E2E Dep Task B' }),
    ])
    taskAId = a.id
    taskBId = b.id
  })

  afterAll(async () => {
    await client.deleteTask(taskAId).catch(() => {})
    await client.deleteTask(taskBId).catch(() => {})
  })

  it('adds a dependency', async () => {
    await expect(client.addDependency(taskAId, { dependsOn: taskBId })).resolves.not.toThrow()
  })

  it('verifies dependency on task', async () => {
    const task = await client.getTask(taskAId)
    const deps = task.dependencies ?? []
    expect(deps.length).toBeGreaterThan(0)
  })

  it('removes the dependency', async () => {
    await expect(client.deleteDependency(taskAId, { dependsOn: taskBId })).resolves.not.toThrow()
  })
})

describe.skipIf(!TOKEN)('Task link lifecycle e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskAId: string
  let taskBId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found')
    listId = backlog.id
    const [a, b] = await Promise.all([
      client.createTask(listId, { name: 'E2E Link Task A' }),
      client.createTask(listId, { name: 'E2E Link Task B' }),
    ])
    taskAId = a.id
    taskBId = b.id
  })

  afterAll(async () => {
    await client.deleteTask(taskAId).catch(() => {})
    await client.deleteTask(taskBId).catch(() => {})
  })

  it('adds a task link', async () => {
    await expect(client.addTaskLink(taskAId, taskBId)).resolves.not.toThrow()
  })

  it('verifies link on task', async () => {
    const task = await client.getTask(taskAId)
    const links = task.linked_tasks ?? []
    expect(links.length).toBeGreaterThan(0)
  })

  it('removes the task link', async () => {
    await expect(client.deleteTaskLink(taskAId, taskBId)).resolves.not.toThrow()
  })
})

describe.skipIf(!TOKEN)('Threaded comment lifecycle e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskId: string
  let commentId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found')
    listId = backlog.id
    const task = await client.createTask(listId, { name: 'E2E Thread Test Task' })
    taskId = task.id
    const result = await client.postComment(taskId, 'E2E parent comment')
    commentId = String(result.id)
  })

  afterAll(async () => {
    await client.deleteTask(taskId).catch(() => {})
  })

  it('creates a threaded reply', async () => {
    await expect(
      client.createThreadedComment(commentId, 'E2E threaded reply'),
    ).resolves.not.toThrow()
  })

  it('gets threaded comments', async () => {
    const replies = await client.getThreadedComments(commentId)
    expect(Array.isArray(replies)).toBe(true)
    expect(replies.length).toBeGreaterThan(0)
  })
})
