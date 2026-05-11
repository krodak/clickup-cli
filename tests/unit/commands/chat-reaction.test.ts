import { describe, expect, it } from 'vitest'

import type { ChatReaction } from '../../../src/api.js'

const sampleReactions: ChatReaction[] = [
  {
    reaction: 'thumbsup',
    user_id: 'u1',
    date: 1704067200000,
  },
  {
    reaction: 'heart',
    user_id: 'u2',
    date: 1704153600000,
  },
  {
    reaction: 'thumbsup',
    user_id: 'u3',
    date: 1704240000000,
  },
]

describe('formatReactions', () => {
  it('returns "No reactions" for empty array', async () => {
    const { formatReactions } = await import('../../../src/commands/chat-reaction.js')
    expect(formatReactions([])).toBe('No reactions')
  })

  it('shows emoji names with user IDs', async () => {
    const { formatReactions } = await import('../../../src/commands/chat-reaction.js')
    const result = formatReactions(sampleReactions)
    expect(result).toContain('thumbsup')
    expect(result).toContain('u1')
    expect(result).toContain('heart')
    expect(result).toContain('u2')
    expect(result).toContain('u3')
  })

  it('groups reactions by emoji', async () => {
    const { formatReactions } = await import('../../../src/commands/chat-reaction.js')
    const result = formatReactions(sampleReactions)
    const lines = result.split('\n')
    const thumbsupLine = lines.find(l => l.includes('thumbsup'))
    expect(thumbsupLine).toContain('u1')
    expect(thumbsupLine).toContain('u3')
  })
})

describe('formatReactionsMarkdown', () => {
  it('returns "No reactions" for empty array', async () => {
    const { formatReactionsMarkdown } = await import('../../../src/commands/chat-reaction.js')
    expect(formatReactionsMarkdown([])).toBe('No reactions')
  })

  it('returns markdown list with emoji and users', async () => {
    const { formatReactionsMarkdown } = await import('../../../src/commands/chat-reaction.js')
    const result = formatReactionsMarkdown(sampleReactions)
    expect(result).toContain('thumbsup')
    expect(result).toContain('heart')
    expect(result).toContain('u1')
    expect(result).toContain('u2')
    expect(result).toContain('u3')
    expect(result).toMatch(/^- /)
  })
})
