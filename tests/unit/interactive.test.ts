vi.mock('@inquirer/prompts', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    confirm: vi.fn(),
    checkbox: vi.fn(),
  }
})

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirm } from '@inquirer/prompts'
import { execFileSync } from 'node:child_process'
import type { Task } from '../../src/api.js'
import type { TaskSummary } from '../../src/commands/tasks.js'

const makeFullTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'abc123',
  name: 'Fix the bug',
  status: { status: 'in progress', color: '#fff' },
  custom_item_id: 0,
  assignees: [{ id: 1, username: 'Krzysztof Rodak' }],
  url: 'https://app.clickup.com/t/abc123',
  list: { id: 'l1', name: 'Sprint 1' },
  ...overrides,
})

const makeSummary = (overrides: Partial<TaskSummary> = {}): TaskSummary => ({
  id: 'abc123',
  name: 'Fix the bug',
  status: 'in progress',
  task_type: 'task',
  list: 'Sprint 1',
  url: 'https://app.clickup.com/t/abc123',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('formatTaskDetail', () => {
  it('formats task detail with all populated fields', async () => {
    const { formatTaskDetail } = await import('../../src/interactive.js')
    const task = makeFullTask({
      priority: { priority: 'high' },
      time_estimate: 115200000,
      tags: [{ name: 'frontend' }],
      text_content: 'Create generator at Plugins/KhasmGenerator',
    })
    const result = formatTaskDetail(task)
    expect(result).toContain('Fix the bug')
    expect(result).toContain('abc123')
    expect(result).toContain('in progress')
    expect(result).toContain('Sprint 1')
    expect(result).toContain('Krzysztof Rodak')
    expect(result).toContain('high')
    expect(result).toContain('32h')
    expect(result).toContain('frontend')
    expect(result).toContain('Create generator at Plugins/KhasmGenerator')
  })

  it('omits empty fields', async () => {
    const { formatTaskDetail } = await import('../../src/interactive.js')
    const task = makeFullTask({ priority: null, tags: [], assignees: [] })
    const result = formatTaskDetail(task)
    expect(result).not.toContain('Priority')
    expect(result).not.toContain('Tags')
    expect(result).not.toContain('Assignees')
  })

  it('includes parent when present', async () => {
    const { formatTaskDetail } = await import('../../src/interactive.js')
    const task = makeFullTask({ parent: 'parent_id' })
    const result = formatTaskDetail(task)
    expect(result).toContain('parent_id')
  })

  it('shows description preview truncated to 3 lines', async () => {
    const { formatTaskDetail } = await import('../../src/interactive.js')
    const task = makeFullTask({
      text_content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
    })
    const result = formatTaskDetail(task)
    expect(result).toContain('Line 1')
    expect(result).toContain('Line 3')
    expect(result).toContain('2 more lines')
    expect(result).not.toContain('Line 5')
  })
})

describe('interactiveTaskPicker', () => {
  it('returns empty array when no tasks provided', async () => {
    const { interactiveTaskPicker } = await import('../../src/interactive.js')
    const result = await interactiveTaskPicker([])
    expect(result).toEqual([])
  })
})

describe('groupedTaskPicker', () => {
  it('returns empty array when all groups are empty', async () => {
    const { groupedTaskPicker } = await import('../../src/interactive.js')
    const result = await groupedTaskPicker([
      { label: 'IN PROGRESS', tasks: [] },
      { label: 'TO DO', tasks: [] },
    ])
    expect(result).toEqual([])
  })

  it('returns empty array when groups array is empty', async () => {
    const { groupedTaskPicker } = await import('../../src/interactive.js')
    const result = await groupedTaskPicker([])
    expect(result).toEqual([])
  })
})

describe('showDetailsAndOpen', () => {
  it('does nothing when no tasks selected', async () => {
    const { showDetailsAndOpen } = await import('../../src/interactive.js')
    await showDetailsAndOpen([])
  })

  it('fetches full task and prints detail', async () => {
    vi.mocked(confirm).mockResolvedValue(false)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const fullTask = makeFullTask({
      id: 'task_001',
      name: 'My Important Task',
      text_content: 'Some desc',
    })
    const fetchTask = vi.fn().mockResolvedValue(fullTask)

    const { showDetailsAndOpen } = await import('../../src/interactive.js')
    const summary = makeSummary({ id: 'task_001', name: 'My Important Task' })
    await showDetailsAndOpen([summary], fetchTask)

    expect(fetchTask).toHaveBeenCalledWith('task_001')
    const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n')
    expect(output).toContain('task_001')
    expect(output).toContain('My Important Task')
    expect(output).toContain('Some desc')

    logSpy.mockRestore()
  })

  it('prints separator between multiple tasks', async () => {
    vi.mocked(confirm).mockResolvedValue(false)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const fetchTask = vi
      .fn()
      .mockResolvedValueOnce(makeFullTask({ id: 't1', name: 'Task 1' }))
      .mockResolvedValueOnce(makeFullTask({ id: 't2', name: 'Task 2' }))

    const { showDetailsAndOpen } = await import('../../src/interactive.js')
    await showDetailsAndOpen([makeSummary({ id: 't1' }), makeSummary({ id: 't2' })], fetchTask)

    const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n')
    expect(output).toContain('Task 1')
    expect(output).toContain('Task 2')
    expect(output).toContain('\u2500')

    logSpy.mockRestore()
  })

  it('calls open for each URL when confirmed', async () => {
    vi.mocked(confirm).mockResolvedValue(true)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { showDetailsAndOpen } = await import('../../src/interactive.js')
    const tasks = [
      makeSummary({ id: 't1', url: 'https://app.clickup.com/t/t1' }),
      makeSummary({ id: 't2', url: 'https://app.clickup.com/t/t2' }),
    ]
    await showDetailsAndOpen(tasks)

    expect(execFileSync).toHaveBeenCalledTimes(2)
    const calls = vi.mocked(execFileSync).mock.calls
    expect(calls[0]![1]).toEqual(['https://app.clickup.com/t/t1'])
    expect(calls[1]![1]).toEqual(['https://app.clickup.com/t/t2'])

    vi.mocked(console.log).mockRestore()
  })

  it('does not call open when declined', async () => {
    vi.mocked(confirm).mockResolvedValue(false)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { showDetailsAndOpen } = await import('../../src/interactive.js')
    await showDetailsAndOpen([makeSummary()])

    expect(execFileSync).not.toHaveBeenCalled()

    vi.mocked(console.log).mockRestore()
  })
})
