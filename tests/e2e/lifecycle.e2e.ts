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

describe.skipIf(!TOKEN)('Comment lifecycle e2e', () => {
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
    const task = await client.createTask(listId, { name: 'E2E Comment Lifecycle Task' })
    taskId = task.id
  })

  afterAll(async () => {
    await client.deleteTask(taskId).catch(() => {})
  })

  it('posts a comment', async () => {
    const result = await client.postComment(taskId, 'Initial report findings')
    commentId = String(result.id)
    expect(commentId.length).toBeGreaterThan(0)
  })

  it('edits the comment', async () => {
    await client.updateComment(commentId, 'Updated report findings v2')
    const comments = await client.getTaskComments(taskId)
    const found = comments.find((c: { id: string }) => String(c.id) === commentId)
    expect(found).toBeDefined()
  })

  it('deletes the comment', async () => {
    await expect(client.deleteComment(commentId)).resolves.not.toThrow()
  })

  it('verifies comment is gone', async () => {
    const comments = await client.getTaskComments(taskId)
    const found = comments.find((c: { id: string }) => String(c.id) === commentId)
    expect(found).toBeUndefined()
  })
})

describe.skipIf(!TOKEN)('Attachment lifecycle e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskId: string

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
    const task = await client.createTask(listId, { name: 'E2E Attachment Lifecycle Task' })
    taskId = task.id
  })

  afterAll(async () => {
    await client.deleteTask(taskId).catch(() => {})
  })

  it('uploads a file attachment', async () => {
    const { writeFileSync, unlinkSync } = await import('fs')
    const { join } = await import('path')
    const { tmpdir } = await import('os')
    const testFile = join(tmpdir(), 'e2e-test-report.md')
    writeFileSync(testFile, '# Test Report\n\nInitial findings.')

    const result = await client.createTaskAttachment(taskId, testFile)
    expect(result).toBeDefined()

    unlinkSync(testFile)
  })

  it('uploads an updated version', async () => {
    const { writeFileSync, unlinkSync } = await import('fs')
    const { join } = await import('path')
    const { tmpdir } = await import('os')
    const testFile = join(tmpdir(), 'e2e-test-report-v2.md')
    writeFileSync(testFile, '# Test Report v2\n\nUpdated findings with more data.')

    const result = await client.createTaskAttachment(taskId, testFile)
    expect(result).toBeDefined()

    unlinkSync(testFile)
  })

  it('task shows attachments in detail', async () => {
    const task = await client.getTask(taskId)
    expect(task.attachments).toBeDefined()
    expect(task.attachments!.length).toBeGreaterThanOrEqual(2)
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

describe.skipIf(!TOKEN)('View lifecycle e2e', () => {
  let client: ClickUpClient
  let listId: string
  let viewId: string

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

  afterAll(async () => {
    if (viewId) await client.deleteView(viewId).catch(() => {})
  })

  it('creates a list view', async () => {
    const view = await client.createListView(listId, { name: 'E2E Test View', type: 'list' })
    viewId = view.id
    expect(view.id).toBeTypeOf('string')
    expect(view.name).toBe('E2E Test View')
  })

  it('lists views on the list', async () => {
    const data = await client.getListViews(listId)
    expect(data.views).toBeDefined()
    expect(Array.isArray(data.views)).toBe(true)
  })

  it('gets the view', async () => {
    const view = await client.getView(viewId)
    expect(view.id).toBe(viewId)
  })

  it('updates the view', async () => {
    await expect(
      client.updateView(viewId, { name: 'E2E Test View UPDATED', type: 'list' }),
    ).resolves.not.toThrow()
  })

  it('deletes the view', async () => {
    await expect(client.deleteView(viewId)).resolves.not.toThrow()
    viewId = ''
  })
})

describe.skipIf(!TOKEN)('Goal lifecycle e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let goalId: string
  let keyResultId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
  })

  afterAll(async () => {
    if (keyResultId) await client.deleteKeyResult(keyResultId).catch(() => {})
    if (goalId) await client.deleteGoal(goalId).catch(() => {})
  })

  it('creates a goal', async () => {
    const goal = await client.createGoal(teamId, 'E2E Test Goal', {
      description: 'Created by e2e test suite',
    })
    goalId = goal.id
    expect(goal.id).toBeTypeOf('string')
    expect(goal.name).toBe('E2E Test Goal')
  })

  it('lists goals and finds the created one', async () => {
    const goals = await client.getGoals(teamId)
    const found = goals.find(g => g.id === goalId)
    expect(found).toBeDefined()
  })

  it('updates the goal', async () => {
    await expect(
      client.updateGoal(goalId, { name: 'E2E Test Goal UPDATED' }),
    ).resolves.not.toThrow()
  })

  it('creates a key result', async () => {
    const kr = await client.createKeyResult(goalId, 'E2E Key Result', 'number', 100)
    keyResultId = kr.id
    expect(kr.id).toBeTypeOf('string')
  })

  it('lists key results', async () => {
    const keyResults = await client.getKeyResults(goalId)
    const found = keyResults.find(kr => kr.id === keyResultId)
    expect(found).toBeDefined()
  })

  it('updates key result progress', async () => {
    await expect(
      client.updateKeyResult(keyResultId, { steps_current: 50, note: 'E2E progress' }),
    ).resolves.not.toThrow()
  })

  it('deletes the key result', async () => {
    await expect(client.deleteKeyResult(keyResultId)).resolves.not.toThrow()
    keyResultId = ''
  })

  it('deletes the goal', async () => {
    await expect(client.deleteGoal(goalId)).resolves.not.toThrow()
    goalId = ''
  })
})
