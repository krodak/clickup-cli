vi.mock('@inquirer/prompts', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    confirm: vi.fn(),
    checkbox: vi.fn(),
  }
})

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirm } from '@inquirer/prompts'
import { execSync } from 'child_process'
import type { TaskSummary } from './commands/tasks.js'

const makeTask = (overrides: Partial<TaskSummary> = {}): TaskSummary => ({
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
  it('formats task detail block with all fields', async () => {
    const { formatTaskDetail } = await import('./interactive.js')
    const task = makeTask()
    const result = formatTaskDetail(task)
    expect(result).toContain('abc123')
    expect(result).toContain('Fix the bug')
    expect(result).toContain('in progress')
    expect(result).toContain('Sprint 1')
    expect(result).toContain('https://app.clickup.com/t/abc123')
    expect(result).toContain('Type:')
  })

  it('includes parent when present', async () => {
    const { formatTaskDetail } = await import('./interactive.js')
    const task = makeTask({ parent: 'parent_id' })
    const result = formatTaskDetail(task)
    expect(result).toContain('parent_id')
  })

  it('omits parent line when not present', async () => {
    const { formatTaskDetail } = await import('./interactive.js')
    const task = makeTask()
    const result = formatTaskDetail(task)
    expect(result).not.toContain('Parent:')
  })
})

describe('interactiveTaskPicker', () => {
  it('returns empty array when no tasks provided', async () => {
    const { interactiveTaskPicker } = await import('./interactive.js')
    const result = await interactiveTaskPicker([])
    expect(result).toEqual([])
  })
})

describe('showDetailsAndOpen', () => {
  it('does nothing when no tasks selected', async () => {
    const { showDetailsAndOpen } = await import('./interactive.js')
    await showDetailsAndOpen([])
  })

  it('prints task detail for each selected task', async () => {
    vi.mocked(confirm).mockResolvedValue(false)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { showDetailsAndOpen } = await import('./interactive.js')
    const task = makeTask({ id: 'task_001', name: 'My Important Task' })
    await showDetailsAndOpen([task])

    const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n')
    expect(output).toContain('task_001')
    expect(output).toContain('My Important Task')

    logSpy.mockRestore()
  })

  it('calls open for each URL when confirmed', async () => {
    vi.mocked(confirm).mockResolvedValue(true)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { showDetailsAndOpen } = await import('./interactive.js')
    const tasks = [
      makeTask({ id: 't1', url: 'https://app.clickup.com/t/t1' }),
      makeTask({ id: 't2', url: 'https://app.clickup.com/t/t2' }),
    ]
    await showDetailsAndOpen(tasks)

    expect(execSync).toHaveBeenCalledTimes(2)
    expect(execSync).toHaveBeenCalledWith('open "https://app.clickup.com/t/t1"')
    expect(execSync).toHaveBeenCalledWith('open "https://app.clickup.com/t/t2"')

    vi.mocked(console.log).mockRestore()
  })

  it('does not call open when declined', async () => {
    vi.mocked(confirm).mockResolvedValue(false)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { showDetailsAndOpen } = await import('./interactive.js')
    const task = makeTask()
    await showDetailsAndOpen([task])

    expect(execSync).not.toHaveBeenCalled()

    vi.mocked(console.log).mockRestore()
  })
})
