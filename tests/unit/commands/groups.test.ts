import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetGroups = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getGroups: mockGetGroups,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleGroups = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    team_id: 'team1',
    name: 'Mobile Team',
    handle: 'mobile-team',
    date_created: '1700000000000',
    members: [
      { id: 1, username: 'alice', email: 'alice@example.com' },
      { id: 2, username: 'bob', email: 'bob@example.com' },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    team_id: 'team1',
    name: 'Backend',
    handle: 'backend',
    date_created: '1700000000001',
    members: [{ id: 3, username: 'carol', email: 'carol@example.com' }],
  },
]

describe('listGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns groups from API', async () => {
    mockGetGroups.mockResolvedValue(sampleGroups)
    const { listGroups } = await import('../../../src/commands/groups.js')
    const result = await listGroups(mockConfig)
    expect(result).toEqual(sampleGroups)
    expect(mockGetGroups).toHaveBeenCalledOnce()
  })
})

describe('formatGroupsTable', () => {
  it('returns "No groups found" for empty array', async () => {
    const { formatGroupsTable } = await import('../../../src/commands/groups.js')
    expect(formatGroupsTable([])).toBe('No groups found')
  })

  it('formats groups with handle, name, id, and member count', async () => {
    const { formatGroupsTable } = await import('../../../src/commands/groups.js')
    const result = formatGroupsTable(sampleGroups)
    expect(result).toContain('mobile-team')
    expect(result).toContain('Mobile Team')
    expect(result).toContain('backend')
    expect(result).toContain('Backend')
    expect(result).toContain('2')
    expect(result).toContain('1')
  })
})

describe('formatGroupsMarkdown', () => {
  it('returns "No groups found" for empty array', async () => {
    const { formatGroupsMarkdown } = await import('../../../src/commands/groups.js')
    expect(formatGroupsMarkdown([])).toBe('No groups found')
  })

  it('formats groups as markdown list with handle, name, id, members', async () => {
    const { formatGroupsMarkdown } = await import('../../../src/commands/groups.js')
    const result = formatGroupsMarkdown(sampleGroups)
    expect(result).toContain('@mobile-team')
    expect(result).toContain('Mobile Team')
    expect(result).toContain('00000000-0000-0000-0000-000000000001')
    expect(result).toContain('2 members')
    expect(result).toContain('@backend')
    expect(result).toContain('1 member')
  })
})
