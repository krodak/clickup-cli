import { describe, expect, it } from 'vitest'

import type { ChatChannel } from '../../../src/api.js'

const sampleChannels: ChatChannel[] = [
  {
    id: 'ch_1',
    name: 'general',
    type: 'CHANNEL',
    visibility: 'PUBLIC',
    creator: 'u1',
    created_at: '2025-01-01T00:00:00Z',
    workspace_id: 'ws1',
    archived: false,
    topic: 'General discussion',
  },
  {
    id: 'ch_2',
    name: 'design-team',
    type: 'CHANNEL',
    visibility: 'PRIVATE',
    creator: 'u2',
    created_at: '2025-02-01T00:00:00Z',
    workspace_id: 'ws1',
    archived: false,
  },
  {
    id: 'ch_3',
    name: '',
    type: 'DM',
    visibility: 'PRIVATE',
    creator: 'u3',
    created_at: '2025-03-01T00:00:00Z',
    workspace_id: 'ws1',
    archived: false,
  },
]

describe('formatChannelsTable', () => {
  it('returns "No channels found" for empty array', async () => {
    const { formatChannelsTable } = await import('../../../src/commands/chat.js')
    expect(formatChannelsTable([])).toBe('No channels found')
  })

  it('formats channels with name, type, and visibility', async () => {
    const { formatChannelsTable } = await import('../../../src/commands/chat.js')
    const result = formatChannelsTable(sampleChannels)
    expect(result).toContain('general')
    expect(result).toContain('CHANNEL')
    expect(result).toContain('PUBLIC')
    expect(result).toContain('design-team')
    expect(result).toContain('PRIVATE')
    expect(result).toContain('DM')
    expect(result).toContain('ch_1')
  })
})

describe('formatChannelsMarkdown', () => {
  it('returns "No channels found" for empty array', async () => {
    const { formatChannelsMarkdown } = await import('../../../src/commands/chat.js')
    expect(formatChannelsMarkdown([])).toBe('No channels found')
  })

  it('formats channels as markdown list', async () => {
    const { formatChannelsMarkdown } = await import('../../../src/commands/chat.js')
    const result = formatChannelsMarkdown(sampleChannels)
    expect(result).toContain('general')
    expect(result).toContain('ch_1')
    expect(result).toContain('CHANNEL')
    expect(result).toContain('design-team')
    expect(result).toContain('DM')
  })
})

describe('formatChannelDetail', () => {
  it('shows all channel fields', async () => {
    const { formatChannelDetail } = await import('../../../src/commands/chat.js')
    const result = formatChannelDetail(sampleChannels[0]!)
    expect(result).toContain('general')
    expect(result).toContain('ch_1')
    expect(result).toContain('CHANNEL')
    expect(result).toContain('PUBLIC')
    expect(result).toContain('General discussion')
  })

  it('handles channel without topic', async () => {
    const { formatChannelDetail } = await import('../../../src/commands/chat.js')
    const result = formatChannelDetail(sampleChannels[1]!)
    expect(result).toContain('design-team')
    expect(result).toContain('ch_2')
    expect(result).toContain('PRIVATE')
  })

  it('handles DM channel', async () => {
    const { formatChannelDetail } = await import('../../../src/commands/chat.js')
    const result = formatChannelDetail(sampleChannels[2]!)
    expect(result).toContain('ch_3')
    expect(result).toContain('DM')
  })
})

describe('formatChatMembers', () => {
  it('returns "No members found" for empty array', async () => {
    const { formatChatMembers } = await import('../../../src/commands/chat.js')
    expect(formatChatMembers([])).toBe('No members found')
  })

  it('formats members with username and email', async () => {
    const { formatChatMembers } = await import('../../../src/commands/chat.js')
    const members = [
      { user: { id: 'u1', username: 'alice', email: 'alice@test.com' }, type: 'member' },
      { user: { id: 'u2', name: 'Bob Smith', email: 'bob@test.com' }, type: 'admin' },
    ]
    const result = formatChatMembers(members)
    expect(result).toContain('alice')
    expect(result).toContain('alice@test.com')
    expect(result).toContain('Bob Smith')
    expect(result).toContain('bob@test.com')
  })
})

describe('formatChatMembersMarkdown', () => {
  it('returns "No members found" for empty array', async () => {
    const { formatChatMembersMarkdown } = await import('../../../src/commands/chat.js')
    expect(formatChatMembersMarkdown([])).toBe('No members found')
  })

  it('formats members as markdown list', async () => {
    const { formatChatMembersMarkdown } = await import('../../../src/commands/chat.js')
    const members = [
      { user: { id: 'u1', username: 'alice', email: 'alice@test.com' }, type: 'member' },
    ]
    const result = formatChatMembersMarkdown(members)
    expect(result).toContain('alice')
    expect(result).toContain('u1')
    expect(result).toContain('alice@test.com')
  })
})
