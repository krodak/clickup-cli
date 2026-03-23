import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../../src/api.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('Task lifecycle e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let listId: string
  let taskId: string
  let subtaskId: string
  let commentId: string
  let checklistId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found in E2E Tests space')
    listId = backlog.id
  })

  it('creates a task', async () => {
    const task = await client.createTask(listId, {
      name: 'E2E Lifecycle Test Task',
      description: 'Created by e2e test suite',
    })
    taskId = task.id
    expect(task.name).toBe('E2E Lifecycle Test Task')
    expect(task.id).toBeTypeOf('string')
  })

  it('reads the created task', async () => {
    const task = await client.getTask(taskId)
    expect(task.id).toBe(taskId)
    expect(task.name).toBe('E2E Lifecycle Test Task')
  })

  it('updates the task', async () => {
    await client.updateTask(taskId, { name: 'E2E Lifecycle Test Task UPDATED' })
    const task = await client.getTask(taskId)
    expect(task.name).toBe('E2E Lifecycle Test Task UPDATED')
  })

  it('creates a subtask', async () => {
    const subtask = await client.createTask(listId, {
      name: 'E2E Subtask',
      parent: taskId,
    })
    subtaskId = subtask.id
    expect(subtask.id).toBeTypeOf('string')
  })

  it('posts a comment', async () => {
    const result = await client.postComment(taskId, 'E2E test comment')
    commentId = String(result.id)
    expect(commentId.length).toBeGreaterThan(0)
  })

  it('reads comments', async () => {
    const comments = await client.getTaskComments(taskId)
    expect(comments.length).toBeGreaterThan(0)
    const found = comments.find((c: { id: string }) => String(c.id) === commentId)
    expect(found).toBeDefined()
  })

  it('creates a checklist', async () => {
    const checklist = await client.createChecklist(taskId, 'E2E Checklist')
    checklistId = checklist.id
    expect(checklist.name).toBe('E2E Checklist')
  })

  it('adds a checklist item', async () => {
    const checklist = await client.createChecklistItem(checklistId, 'E2E Item')
    const item = checklist.items.find(i => i.name === 'E2E Item')
    expect(item).toBeDefined()
  })

  it('deletes the checklist without error', async () => {
    await expect(client.deleteChecklist(checklistId)).resolves.not.toThrow()
  })

  it('deletes the comment without error', async () => {
    await expect(client.deleteComment(commentId)).resolves.not.toThrow()
  })

  it('deletes the subtask without error', async () => {
    await expect(client.deleteTask(subtaskId)).resolves.not.toThrow()
  })

  it('deletes the task without error', async () => {
    await expect(client.deleteTask(taskId)).resolves.not.toThrow()
  })

  it('confirms task is gone after delete', async () => {
    await expect(client.getTask(taskId)).rejects.toThrow()
  })
})

describe.skipIf(!TOKEN)('Tag lifecycle e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let listId: string
  let taskId: string
  let spaceId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    spaceId = testSpace.id
    const lists = await client.getLists(spaceId)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found')
    listId = backlog.id
    const task = await client.createTask(listId, { name: 'E2E Tag Test Task' })
    taskId = task.id
  })

  afterAll(async () => {
    await client.deleteTask(taskId).catch(() => {})
  })

  it('adds a tag to a task', async () => {
    await expect(client.addTagToTask(taskId, 'e2e-test-tag')).resolves.not.toThrow()
  })

  it('verifies tag on task', async () => {
    const task = await client.getTask(taskId)
    const tagNames = task.tags?.map(t => t.name) ?? []
    expect(tagNames).toContain('e2e-test-tag')
  })

  it('removes the tag', async () => {
    await expect(client.removeTagFromTask(taskId, 'e2e-test-tag')).resolves.not.toThrow()
  })

  it('verifies tag removed', async () => {
    const task = await client.getTask(taskId)
    const tagNames = task.tags?.map(t => t.name) ?? []
    expect(tagNames).not.toContain('e2e-test-tag')
  })
})

describe.skipIf(!TOKEN)('Time tracking lifecycle e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let listId: string
  let taskId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found')
    listId = backlog.id
    const task = await client.createTask(listId, { name: 'E2E Time Test Task' })
    taskId = task.id
  })

  afterAll(async () => {
    await client.stopTimeEntry(teamId).catch(() => {})
    await client.deleteTask(taskId).catch(() => {})
  })

  it('starts a timer', async () => {
    const entry = await client.startTimeEntry(teamId, taskId, 'E2E timer')
    expect(entry).toBeDefined()
    expect(entry.duration).toBeLessThan(0)
  })

  it('checks running timer', async () => {
    const entry = await client.getRunningTimeEntry(teamId)
    expect(entry).not.toBeNull()
  })

  it('stops the timer', async () => {
    const entry = await client.stopTimeEntry(teamId)
    expect(entry).toBeDefined()
    expect(entry.duration).toBeGreaterThanOrEqual(0)
  })

  it('logs a manual time entry', async () => {
    const entry = await client.createTimeEntry(teamId, taskId, 60000, {
      description: 'E2E manual entry',
    })
    expect(entry).toBeDefined()
  })

  it('lists time entries', async () => {
    const entries = await client.getTimeEntries(teamId, { taskId })
    expect(entries.length).toBeGreaterThan(0)
  })
})
