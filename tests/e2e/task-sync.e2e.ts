import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../../src/api.js'
import { compileCufm } from '../../src/cufm/compile.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('task-sync CUFM e2e', () => {
  let client: ClickUpClient
  let listId: string
  let taskId: string | undefined

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const teamId = teams[0]!.id
    const spaces = await client.getSpaces(teamId)
    const testSpace = spaces.find(s => s.name === 'E2E Tests')
    if (!testSpace) throw new Error('E2E Tests space not found')
    const lists = await client.getLists(testSpace.id)
    const backlog = lists.find(l => l.name === 'Backlog')
    if (!backlog) throw new Error('Backlog list not found in E2E Tests space')
    listId = backlog.id
  })

  afterAll(async () => {
    if (taskId) await client.deleteTask(taskId)
  })

  it('writes a tight heading and a table via native delta', async () => {
    const { ops } = compileCufm(`# Heading One
Paragraph immediately after.

| Col A | Col B |
| --- | --- |
| 1 | 2 |
`)
    const created = await client.createTask(listId, {
      name: 'E2E CUFM sync',
      description: { ops },
    })
    taskId = created.id
    const task = await client.getTask(taskId)
    const md = task.markdown_description ?? ''
    expect(md).toMatch(/^# Heading One\nParagraph immediately after/)
    expect(md).toContain('| Col A |')
  })
})
