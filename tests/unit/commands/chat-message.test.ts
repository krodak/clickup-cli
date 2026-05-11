import { describe, expect, it } from 'vitest'

import type { ChatMessage } from '../../../src/api.js'

const sampleMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    content: 'Hello everyone!',
    type: 'message',
    user_id: 'u1',
    date: 1704067200000,
    parent_channel: 'ch_1',
    resolved: false,
    replies_count: 2,
  },
  {
    id: 'msg_2',
    content: 'Here is my update on the project.',
    type: 'post',
    user_id: 'u2',
    date: 1704153600000,
    parent_channel: 'ch_1',
    resolved: false,
    post_data: { title: 'Weekly Update' },
  },
  {
    id: 'msg_3',
    content: 'Got it, thanks!',
    type: 'message',
    user_id: 'u3',
    date: 1704240000000,
    parent_channel: 'ch_1',
    resolved: true,
  },
]

describe('formatMessages', () => {
  it('returns "No messages" for empty array', async () => {
    const { formatMessages } = await import('../../../src/commands/chat-message.js')
    expect(formatMessages([])).toBe('No messages')
  })

  it('shows messages with author, date, and content', async () => {
    const { formatMessages } = await import('../../../src/commands/chat-message.js')
    const result = formatMessages(sampleMessages)
    expect(result).toContain('Hello everyone!')
    expect(result).toContain('u1')
    expect(result).toContain('msg_1')
  })

  it('shows post title for post type messages', async () => {
    const { formatMessages } = await import('../../../src/commands/chat-message.js')
    const result = formatMessages(sampleMessages)
    expect(result).toContain('Weekly Update')
  })

  it('shows reply count when present', async () => {
    const { formatMessages } = await import('../../../src/commands/chat-message.js')
    const result = formatMessages(sampleMessages)
    expect(result).toContain('2')
  })
})

describe('formatMessagesMarkdown', () => {
  it('returns "No messages" for empty array', async () => {
    const { formatMessagesMarkdown } = await import('../../../src/commands/chat-message.js')
    expect(formatMessagesMarkdown([])).toBe('No messages')
  })

  it('formats messages as markdown', async () => {
    const { formatMessagesMarkdown } = await import('../../../src/commands/chat-message.js')
    const result = formatMessagesMarkdown(sampleMessages)
    expect(result).toContain('Hello everyone!')
    expect(result).toContain('u1')
    expect(result).toContain('msg_1')
  })

  it('includes post title in markdown output', async () => {
    const { formatMessagesMarkdown } = await import('../../../src/commands/chat-message.js')
    const result = formatMessagesMarkdown(sampleMessages)
    expect(result).toContain('Weekly Update')
  })
})
