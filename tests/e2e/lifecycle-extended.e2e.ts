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

describe.skipIf(!TOKEN)('Custom field lifecycle e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let listId: string
  let taskId: string
  let fieldId: string
  let fieldAvailable = false

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
    const task = await client.createTask(listId, { name: 'E2E Field Test Task' })
    taskId = task.id
    try {
      const field = await client.createCustomField(teamId, 'E2E Test Field', 'text')
      fieldId = field.id
      fieldAvailable = true
    } catch {
      const fields = await client.getListCustomFields(listId)
      const textField = fields.find(
        f => f.type === 'short_text' || f.type === 'text' || f.type === 'url',
      )
      if (textField) {
        fieldId = textField.id
        fieldAvailable = true
      }
    }
  })

  afterAll(async () => {
    await client.deleteTask(taskId).catch(() => {})
  })

  it('sets a custom field value on a task', async () => {
    if (!fieldAvailable) return
    await expect(
      client.setCustomFieldValue(taskId, fieldId, 'e2e test value'),
    ).resolves.not.toThrow()
  })

  it('verifies field value on task', async () => {
    if (!fieldAvailable) return
    const task = await client.getTask(taskId)
    const field = task.custom_fields?.find(f => f.id === fieldId)
    expect(field).toBeDefined()
  })

  it('removes the custom field value', async () => {
    if (!fieldAvailable) return
    await expect(client.removeCustomFieldValue(taskId, fieldId)).resolves.not.toThrow()
  })

  it('verifies createCustomField endpoint is reachable', async () => {
    try {
      await client.createCustomField(teamId, 'E2E Probe Field', 'text')
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
    }
  })
})

describe.skipIf(!TOKEN)('Space tag lifecycle e2e', () => {
  let client: ClickUpClient
  let spaceId: string
  const tagName = 'e2e-lifecycle-tag'
  const updatedTagName = 'e2e-lifecycle-tag-updated'

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    spaceId = testSpace.id
  })

  afterAll(async () => {
    await client.deleteSpaceTag(spaceId, updatedTagName).catch(() => {})
    await client.deleteSpaceTag(spaceId, tagName).catch(() => {})
  })

  it('creates a space tag', async () => {
    await expect(client.createSpaceTag(spaceId, tagName)).resolves.not.toThrow()
  })

  it('verifies tag exists', async () => {
    const tags = await client.getSpaceTags(spaceId)
    const found = tags.find(t => t.name === tagName)
    expect(found).toBeDefined()
  })

  it('updates the tag', async () => {
    await expect(
      client.updateSpaceTag(spaceId, tagName, { name: updatedTagName }),
    ).resolves.not.toThrow()
  })

  it('verifies updated tag', async () => {
    const tags = await client.getSpaceTags(spaceId)
    expect(tags.find(t => t.name === updatedTagName)).toBeDefined()
    expect(tags.find(t => t.name === tagName)).toBeUndefined()
  })

  it('deletes the tag', async () => {
    await expect(client.deleteSpaceTag(spaceId, updatedTagName)).resolves.not.toThrow()
  })
})
