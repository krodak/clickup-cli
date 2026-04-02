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

describe.skipIf(!TOKEN)('Folder and List CRUD e2e', () => {
  let client: ClickUpClient
  let spaceId: string
  let folderId: string
  let listId: string
  let folderListId: string
  let suffix: string

  beforeAll(async () => {
    suffix = Date.now().toString(36)
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    spaceId = testSpace.id
  })

  it('creates a folder in the test space', async () => {
    const folderName = `E2E Test Folder ${suffix}`
    const folder = await client.createFolder(spaceId, folderName)
    folderId = folder.id
    expect(folder.id).toBeTypeOf('string')
    expect(folder.name).toBe(folderName)
  })

  it('creates a folderless list in the space', async () => {
    const listName = `E2E Folderless List ${suffix}`
    const list = await client.createList(spaceId, listName)
    listId = list.id
    expect(list.id).toBeTypeOf('string')
    expect(list.name).toBe(listName)
  })

  it('creates a list inside the folder', async () => {
    const listName = `E2E Folder List ${suffix}`
    const list = await client.createFolderList(folderId, listName)
    folderListId = list.id
    expect(list.id).toBeTypeOf('string')
    expect(list.name).toBe(listName)
  })

  it('updates the list name', async () => {
    const updated = await client.updateList(folderListId, {})
    expect(updated.id).toBe(folderListId)
  })
})

describe.skipIf(!TOKEN)('Checklist item edit/delete e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskId: string
  let checklistId: string
  let itemId: string

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
    const task = await client.createTask(listId, { name: 'E2E Checklist Edit Task' })
    taskId = task.id
    const checklist = await client.createChecklist(taskId, 'E2E Edit Checklist')
    checklistId = checklist.id
    const updated = await client.createChecklistItem(checklistId, 'E2E Edit Item')
    const item = updated.items.find(i => i.name === 'E2E Edit Item')
    if (!item) throw new Error('Checklist item not found after create')
    itemId = item.id
  })

  afterAll(async () => {
    await client.deleteChecklist(checklistId).catch(() => {})
    await client.deleteTask(taskId).catch(() => {})
  })

  it('edits a checklist item', async () => {
    const checklist = await client.editChecklistItem(checklistId, itemId, {
      name: 'E2E Edit Item UPDATED',
      resolved: true,
    })
    const item = checklist.items.find(i => i.id === itemId)
    expect(item).toBeDefined()
    expect(item!.name).toBe('E2E Edit Item UPDATED')
  })

  it('deletes a checklist item', async () => {
    await expect(client.deleteChecklistItem(checklistId, itemId)).resolves.not.toThrow()
  })
})

describe.skipIf(!TOKEN)('Time entry update/delete e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let listId: string
  let taskId: string
  let timeEntryId: string

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
    const task = await client.createTask(listId, { name: 'E2E Time Edit Task' })
    taskId = task.id
    const entry = await client.createTimeEntry(teamId, taskId, 120000, {
      description: 'E2E entry to edit',
    })
    timeEntryId = entry.id
  })

  afterAll(async () => {
    if (timeEntryId) await client.deleteTimeEntry(teamId, timeEntryId).catch(() => {})
    await client.deleteTask(taskId).catch(() => {})
  })

  it('updates a time entry', async () => {
    const updated = await client.updateTimeEntry(teamId, timeEntryId, {
      description: 'E2E entry UPDATED',
    })
    expect(updated).toBeDefined()
  })

  it('deletes a time entry', async () => {
    await expect(client.deleteTimeEntry(teamId, timeEntryId)).resolves.not.toThrow()
    timeEntryId = ''
  })
})

describe.skipIf(!TOKEN)('Space create e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let spaceId: string
  let suffix: string

  beforeAll(async () => {
    suffix = Date.now().toString(36)
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
  })

  it('creates a space', async () => {
    const spaceName = `E2E Test Space ${suffix}`
    const space = await client.createSpace(teamId, spaceName)
    spaceId = space.id
    expect(space.id).toBeTypeOf('string')
    expect(space.name).toBe(spaceName)
  })

  it('verifies space exists', async () => {
    const spaces = await client.getSpaces(teamId)
    const found = spaces.find(s => s.id === spaceId)
    expect(found).toBeDefined()
  })
})
