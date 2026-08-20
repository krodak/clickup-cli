import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseMarkdownFile } from '../../../src/task-sync/frontmatter.js'
import { buildSyncGraph } from '../../../src/task-sync/graph.js'
import { discoverTaskFiles } from '../../../src/task-sync/discover.js'

const mockCreateTask = vi.fn()
const mockUpdateTask = vi.fn()
const mockGetTask = vi.fn()
const mockAddDependency = vi.fn()
const mockGetTasksFromList = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      getTask: mockGetTask,
      addDependency: mockAddDependency,
      getTasksFromList: mockGetTasksFromList,
    }
  }),
}))

const config = { apiToken: 'pk_test', teamId: 'team1' }

function md(front: string, body = '# Body\n'): string {
  return `---\n${front}\n---\n${body}`
}

describe('rewriteLinkFrontmatter', () => {
  it('rewrites parent/subtasks/depends_on to relative paths and keeps remote ids', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cup-rewrite-'))
    await writeFile(
      join(dir, 'epic.md'),
      md(`title: Epic
clickup_id: p1
subtasks:
  - child.md`),
    )
    await writeFile(
      join(dir, 'child.md'),
      md(`title: Child
clickup_id: c1
parent: p1
depends_on:
  - c2
  - remote99`),
    )
    await writeFile(
      join(dir, 'setup.md'),
      md(`title: Setup
clickup_id: c2`),
    )
    const { rewriteLinkFrontmatter } = await import('../../../src/task-sync/tree.js')
    const files = await discoverTaskFiles(dir)
    await rewriteLinkFrontmatter(buildSyncGraph(dir, files))

    const epic = parseMarkdownFile(await readFile(join(dir, 'epic.md'), 'utf8'))
    const child = parseMarkdownFile(await readFile(join(dir, 'child.md'), 'utf8'))
    const setup = parseMarkdownFile(await readFile(join(dir, 'setup.md'), 'utf8'))
    expect(epic.frontmatter.subtasks).toEqual(['./child.md'])
    expect(epic.frontmatter.parent).toBeUndefined()
    expect(child.frontmatter.parent).toBe('./epic.md')
    expect(child.frontmatter.depends_on).toEqual(['./setup.md', 'remote99'])
    expect(setup.frontmatter.subtasks).toBeUndefined()
  })
})

describe('pushSyncDir', () => {
  afterEach(() => {
    mockCreateTask.mockReset()
    mockUpdateTask.mockReset()
    mockGetTask.mockReset()
    mockAddDependency.mockReset()
    mockGetTasksFromList.mockReset()
  })

  it('creates parents first then adds dependency edges', async () => {
    let seq = 0
    mockCreateTask.mockImplementation(
      async (_list: string, opts: { name: string; parent?: string }) => {
        seq += 1
        const id = `t${seq}`
        return {
          id,
          name: opts.name,
          url: `https://app.clickup.com/t/${id}`,
          list: { id: 'L1', name: 'List' },
          parent: opts.parent,
          status: { status: 'open', color: '' },
          assignees: [],
        }
      },
    )
    mockGetTask.mockImplementation(async (id: string) => ({
      id,
      name: 'n',
      url: `https://app.clickup.com/t/${id}`,
      list: { id: 'L1', name: 'List' },
      date_updated: '1',
      parent: id === 't2' ? 't1' : null,
      status: { status: 'open', color: '' },
      assignees: [],
    }))
    mockUpdateTask.mockResolvedValue({})
    mockAddDependency.mockResolvedValue(undefined)

    const dir = await mkdtemp(join(tmpdir(), 'cup-push-tree-'))
    await writeFile(
      join(dir, 'epic.md'),
      md(`title: Epic
list_id: "L1"
subtasks:
  - ./child.md`),
    )
    await writeFile(
      join(dir, 'child.md'),
      md(`title: Child
parent: ./epic.md
depends_on:
  - ./setup.md`),
    )
    await writeFile(
      join(dir, 'setup.md'),
      md(`title: Setup
list_id: "L1"`),
    )

    const { pushSyncDir } = await import('../../../src/task-sync/tree.js')
    const result = await pushSyncDir(config, dir, { create: true, noInput: true })

    expect(mockCreateTask.mock.calls.map(c => c[1].name)).toEqual(['Epic', 'Setup', 'Child'])
    expect(mockCreateTask.mock.calls[2]?.[1]).toMatchObject({ name: 'Child', parent: 't1' })
    expect(mockAddDependency).toHaveBeenCalledWith('t3', { dependsOn: 't2' })
    expect(result.results.map(r => r.action)).toEqual(['created', 'created', 'created'])

    const child = parseMarkdownFile(await readFile(join(dir, 'child.md'), 'utf8'))
    expect(child.frontmatter.parent).toBe('./epic.md')
    expect(child.frontmatter.depends_on).toEqual(['./setup.md'])
    expect(child.frontmatter.clickup_id).toBe('t3')
  })
})
