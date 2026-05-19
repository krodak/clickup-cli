import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskMember } from '../../../src/api.js'

const mockGetTaskMembers = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getTaskMembers: mockGetTaskMembers,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleMembers: TaskMember[] = [
  { id: 1, username: 'alice', email: 'alice@example.com', initials: 'A' },
  { id: 2, username: 'bob', email: 'bob@example.com' },
]

describe('listTaskMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns members from API', async () => {
    mockGetTaskMembers.mockResolvedValue(sampleMembers)
    const { listTaskMembers } = await import('../../../src/commands/task-members.js')
    const result = await listTaskMembers(mockConfig, 'task1')
    expect(result).toEqual(sampleMembers)
    expect(mockGetTaskMembers).toHaveBeenCalledWith('task1')
  })
})

describe('formatTaskMembers', () => {
  it('returns "No task members found" for empty array', async () => {
    const { formatTaskMembers } = await import('../../../src/commands/task-members.js')
    expect(formatTaskMembers([])).toBe('No task members found')
  })

  it('formats members with username, id, and email', async () => {
    const { formatTaskMembers } = await import('../../../src/commands/task-members.js')
    const result = formatTaskMembers(sampleMembers)
    expect(result).toContain('alice')
    expect(result).toContain('bob')
    expect(result).toContain('alice@example.com')
  })
})

describe('formatTaskMembersMarkdown', () => {
  it('returns "No task members found" for empty array', async () => {
    const { formatTaskMembersMarkdown } = await import('../../../src/commands/task-members.js')
    expect(formatTaskMembersMarkdown([])).toBe('No task members found')
  })

  it('formats members as markdown list', async () => {
    const { formatTaskMembersMarkdown } = await import('../../../src/commands/task-members.js')
    const result = formatTaskMembersMarkdown(sampleMembers)
    expect(result).toBe('- **alice** (1) - alice@example.com\n- **bob** (2) - bob@example.com')
  })
})
