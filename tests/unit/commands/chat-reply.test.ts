import { describe, expect, it } from 'vitest'

describe('chat-reply re-exports', () => {
  it('exports formatMessages from chat-message', async () => {
    const { formatMessages } = await import('../../../src/commands/chat-reply.js')
    expect(typeof formatMessages).toBe('function')
  })

  it('exports formatMessagesMarkdown from chat-message', async () => {
    const { formatMessagesMarkdown } = await import('../../../src/commands/chat-reply.js')
    expect(typeof formatMessagesMarkdown).toBe('function')
  })

  it('formatMessages works for replies (same shape as ChatMessage)', async () => {
    const { formatMessages } = await import('../../../src/commands/chat-reply.js')
    const result = formatMessages([])
    expect(result).toBe('No messages')
  })
})
