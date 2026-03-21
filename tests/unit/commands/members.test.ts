import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetWorkspaceMembers = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getWorkspaceMembers: mockGetWorkspaceMembers,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleMembers = [
  { id: 1, username: 'alice', email: 'alice@example.com', initials: 'A', role: 1 },
  { id: 2, username: 'bob', email: 'bob@example.com', initials: 'B', role: 2 },
]

describe('listMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns members from API', async () => {
    mockGetWorkspaceMembers.mockResolvedValue(sampleMembers)
    const { listMembers } = await import('../../../src/commands/members.js')
    const result = await listMembers(mockConfig)
    expect(result).toEqual(sampleMembers)
    expect(mockGetWorkspaceMembers).toHaveBeenCalledWith('team1')
  })
})

describe('formatMembers', () => {
  it('returns "No members found" for empty array', async () => {
    const { formatMembers } = await import('../../../src/commands/members.js')
    expect(formatMembers([])).toBe('No members found')
  })

  it('formats members with username, id, and email', async () => {
    const { formatMembers } = await import('../../../src/commands/members.js')
    const result = formatMembers(sampleMembers)
    expect(result).toContain('alice')
    expect(result).toContain('bob')
    expect(result).toContain('alice@example.com')
  })
})

describe('formatMembersMarkdown', () => {
  it('returns "No members found" for empty array', async () => {
    const { formatMembersMarkdown } = await import('../../../src/commands/members.js')
    expect(formatMembersMarkdown([])).toBe('No members found')
  })

  it('formats members as markdown list', async () => {
    const { formatMembersMarkdown } = await import('../../../src/commands/members.js')
    const result = formatMembersMarkdown(sampleMembers)
    expect(result).toBe('- **alice** (1) - alice@example.com\n- **bob** (2) - bob@example.com')
  })
})
