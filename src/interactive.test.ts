import { describe, it, expect, vi, beforeEach } from 'vitest'
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
})
