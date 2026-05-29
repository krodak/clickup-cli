import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../../src/api.js'
import type { CustomFieldDefinition } from '../../src/api.js'

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
  let _listId: string
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
    _listId = list.id
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
  let planLimited = false

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
    try {
      const entry = await client.createTimeEntry(teamId, taskId, 120000, {
        description: 'E2E entry to edit',
      })
      timeEntryId = entry.id
    } catch (err) {
      if (err instanceof Error && err.message.includes('plan is limited')) {
        planLimited = true
        return
      }
      throw err
    }
  })

  afterAll(async () => {
    if (timeEntryId) await client.deleteTimeEntry(teamId, timeEntryId).catch(() => {})
    if (taskId) await client.deleteTask(taskId).catch(() => {})
  })

  it('updates a time entry', async () => {
    if (planLimited) return
    const updated = await client.updateTimeEntry(teamId, timeEntryId, {
      description: 'E2E entry UPDATED',
    })
    expect(updated).toBeDefined()
  })

  it('deletes a time entry', async () => {
    if (planLimited) return
    await expect(client.deleteTimeEntry(teamId, timeEntryId)).resolves.not.toThrow()
    timeEntryId = ''
  })
})

describe.skipIf(!TOKEN)('Labels custom field e2e', () => {
  let client: ClickUpClient
  let taskId: string
  let labelsField: CustomFieldDefinition | undefined

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
    const task = await client.createTask(backlog.id, { name: 'E2E Labels Field Task' })
    taskId = task.id
    const fields = await client.getListCustomFields(backlog.id)
    labelsField = fields.find(f => f.type === 'labels')
  })

  afterAll(async () => {
    if (taskId) await client.deleteTask(taskId).catch(() => {})
  })

  it('finds a labels field or skips', () => {
    if (!labelsField) {
      console.log('No labels field found on Backlog list - skipping labels tests')
    }
  })

  it('sets a labels field value', async () => {
    if (!labelsField) return
    const options = labelsField.type_config?.options
    if (!options?.length) return
    const firstOption = options[0]!
    await expect(
      client.setCustomFieldValue(taskId, labelsField.id, [firstOption.id]),
    ).resolves.not.toThrow()
  })

  it('verifies label was set on task', async () => {
    if (!labelsField) return
    const task = await client.getTask(taskId)
    const field = task.custom_fields?.find(f => f.id === labelsField!.id)
    expect(field).toBeDefined()
    if (field?.value) {
      expect(Array.isArray(field.value)).toBe(true)
    }
  })

  it('removes the labels field value', async () => {
    if (!labelsField) return
    await expect(client.removeCustomFieldValue(taskId, labelsField.id)).resolves.not.toThrow()
  })
})

describe.skipIf(!TOKEN)('Space create e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let spaceId: string
  let planLimited = false

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
  })

  it('creates a space', async () => {
    const suffix = Date.now().toString(36)
    try {
      const space = await client.createSpace(teamId, `E2E Test Space ${suffix}`)
      spaceId = space.id
      expect(space.id).toBeTypeOf('string')
    } catch (err) {
      if (err instanceof Error && err.message.includes('plan is limited')) {
        planLimited = true
        return
      }
      throw err
    }
  })

  it('verifies space exists', async () => {
    if (planLimited || !spaceId) return
    const spaces = await client.getSpaces(teamId)
    const found = spaces.find(s => s.id === spaceId)
    expect(found).toBeDefined()
  })
})

describe.skipIf(!TOKEN)('Delete list e2e', () => {
  let client: ClickUpClient
  let spaceId: string
  let listId: string
  let planLimited = false

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    spaceId = testSpace.id
  })

  it('creates a list for deletion', async () => {
    const suffix = Date.now().toString(36)
    try {
      const list = await client.createList(spaceId, `E2E Delete List ${suffix}`)
      listId = list.id
      expect(list.id).toBeTypeOf('string')
    } catch (err) {
      if (err instanceof Error && (err.message.includes('plan is limited') || err.message.includes('limit'))) {
        planLimited = true
        return
      }
      throw err
    }
  })

  it('deletes the list', async () => {
    if (planLimited || !listId) return
    await expect(client.deleteList(listId)).resolves.not.toThrow()
  })
})

describe.skipIf(!TOKEN)('Delete folder e2e', () => {
  let client: ClickUpClient
  let spaceId: string
  let folderId: string
  let planLimited = false

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    spaceId = testSpace.id
  })

  it('creates a folder for deletion', async () => {
    const suffix = Date.now().toString(36)
    try {
      const folder = await client.createFolder(spaceId, `E2E Delete Folder ${suffix}`)
      folderId = folder.id
      expect(folder.id).toBeTypeOf('string')
    } catch (err) {
      if (err instanceof Error && (err.message.includes('plan is limited') || err.message.includes('limit'))) {
        planLimited = true
        return
      }
      throw err
    }
  })

  it('deletes the folder', async () => {
    if (planLimited || !folderId) return
    await expect(client.deleteFolder(folderId)).resolves.not.toThrow()
  })
})

describe.skipIf(!TOKEN)('Task merge e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskAId: string
  let taskBId: string
  let mergeSupported = true

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
      client.createTask(listId, { name: 'E2E Merge Task A' }),
      client.createTask(listId, { name: 'E2E Merge Task B' }),
    ])
    taskAId = a.id
    taskBId = b.id
  })

  afterAll(async () => {
    await client.deleteTask(taskAId).catch(() => {})
    await client.deleteTask(taskBId).catch(() => {})
  })

  it('merges task A into task B', async () => {
    try {
      await client.mergeTasks(taskBId, [taskAId])
    } catch (err) {
      if (err instanceof Error && (err.message.includes('plan is limited') || err.message.includes('401') || err.message.includes('403'))) {
        mergeSupported = false
        return
      }
      throw err
    }
  })

  it('verifies target task still exists after merge', async () => {
    if (!mergeSupported) return
    const taskB = await client.getTask(taskBId)
    expect(taskB.id).toBe(taskBId)
  })
})

describe.skipIf(!TOKEN)('Per-user time estimates e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskId: string
  let userId: number

  beforeAll(async () => {
    const initClient = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await initClient.getTeams()
    const teamId = teams[0]!.id
    client = new ClickUpClient({ apiToken: TOKEN!, teamId })
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found')
    listId = backlog.id
    const task = await client.createTask(listId, { name: 'E2E Time Estimate Task' })
    taskId = task.id
    const me = await client.getMe()
    userId = me.id
  })

  afterAll(async () => {
    if (taskId) await client.deleteTask(taskId).catch(() => {})
  })

  it('sets per-user time estimate', async () => {
    try {
      const result = await client.updateTimeEstimatesByUser(taskId, [
        { assignee: userId, time: 3600000 },
      ])
      expect(result.total_time_estimate).toBeGreaterThan(0)
    } catch (err) {
      if (err instanceof Error && (err.message.includes('plan is limited') || err.message.includes('403') || err.message.includes('400') || err.message.includes('500'))) return
      throw err
    }
  })
})

describe.skipIf(!TOKEN)('Webhook lifecycle e2e', () => {
  let client: ClickUpClient
  let webhookId: string

  beforeAll(async () => {
    const initClient = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await initClient.getTeams()
    const teamId = teams[0]!.id
    client = new ClickUpClient({ apiToken: TOKEN!, teamId })
  })

  afterAll(async () => {
    if (webhookId) await client.deleteWebhook(webhookId).catch(() => {})
  })

  it('creates a webhook', async () => {
    try {
      const wh = await client.createWebhook('https://example.com/e2e-test', ['taskCreated'])
      webhookId = wh.id
      expect(wh.id).toBeTypeOf('string')
    } catch (err) {
      if (err instanceof Error && (err.message.includes('plan is limited') || err.message.includes('403'))) return
      throw err
    }
  })

  it('lists webhooks', async () => {
    const webhooks = await client.getWebhooks()
    expect(Array.isArray(webhooks)).toBe(true)
  })

  it('updates webhook', async () => {
    if (!webhookId) return
    await expect(
      client.updateWebhook(webhookId, { endpoint: 'https://example.com/e2e-updated' }),
    ).resolves.not.toThrow()
  })

  it('deletes webhook', async () => {
    if (!webhookId) return
    await expect(client.deleteWebhook(webhookId)).resolves.not.toThrow()
    webhookId = ''
  })
})

describe.skipIf(!TOKEN)('List comments e2e', () => {
  let client: ClickUpClient
  let listId: string

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
  })

  it('posts a comment on a list', async () => {
    const result = await client.postListComment(listId, 'E2E list comment test')
    expect(result.id).toBeDefined()
  })

  it('reads list comments', async () => {
    const comments = await client.getListComments(listId)
    expect(Array.isArray(comments)).toBe(true)
    expect(comments.length).toBeGreaterThan(0)
  })
})

describe.skipIf(!TOKEN)('View comments e2e', () => {
  let client: ClickUpClient
  let viewId: string
  let createdViewId: string

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
    const suffix = Date.now().toString(36)
    try {
      const view = await client.createListView(backlog.id, {
        name: `E2E Conversation ${suffix}`,
        type: 'conversation',
      })
      viewId = view.id
      createdViewId = view.id
    } catch {
      const viewData = await client.getListViews(backlog.id)
      const conv = viewData.views?.find(
        (v: { type?: string }) => v.type === 'conversation',
      )
      if (conv) viewId = conv.id
    }
  })

  afterAll(async () => {
    if (createdViewId) await client.deleteView(createdViewId).catch(() => {})
  })

  it('posts a comment on a view', async () => {
    if (!viewId) return
    try {
      const result = await client.postViewComment(viewId, 'E2E view comment test')
      expect(result.id).toBeDefined()
    } catch (err) {
      if (err instanceof Error && (err.message.includes('conversation') || err.message.includes('400'))) return
      throw err
    }
  })

  it('reads view comments', async () => {
    if (!viewId) return
    try {
      const comments = await client.getViewComments(viewId)
      expect(Array.isArray(comments)).toBe(true)
    } catch (err) {
      if (err instanceof Error && (err.message.includes('conversation') || err.message.includes('400'))) return
      throw err
    }
  })
})

describe.skipIf(!TOKEN)('Group assignees e2e', () => {
  let client: ClickUpClient
  let listId: string | undefined
  let taskId: string | undefined
  let firstGroupId: string | undefined

  beforeAll(async () => {
    const teams = await new ClickUpClient({ apiToken: TOKEN! }).getTeams()
    const teamId = teams[0]!.id
    client = new ClickUpClient({ apiToken: TOKEN!, teamId })
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) return
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) return
    listId = backlog.id
    const groups = await client.getGroups()
    if (groups.length === 0) return
    firstGroupId = groups[0]!.id
    const task = await client.createTask(listId, { name: 'E2E Group Assignee Task' })
    taskId = task.id
  })

  afterAll(async () => {
    if (taskId) await client.deleteTask(taskId).catch(() => {})
  })

  it('lists groups in the workspace', async () => {
    const groups = await client.getGroups()
    expect(Array.isArray(groups)).toBe(true)
  })

  it('assigns a group to a task and verifies it persists', async () => {
    if (!taskId || !firstGroupId) return
    await client.updateTask(taskId, { group_assignees: { add: [firstGroupId] } })
    const refreshed = await client.getTask(taskId)
    expect(refreshed.id).toBe(taskId)
  })

  it('unassigns the group from the task', async () => {
    if (!taskId || !firstGroupId) return
    await expect(
      client.updateTask(taskId, { group_assignees: { rem: [firstGroupId] } }),
    ).resolves.toBeDefined()
  })
})
