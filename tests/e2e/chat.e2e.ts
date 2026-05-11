import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../../src/api.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('Chat lifecycle e2e', () => {
  let client: ClickUpClient
  let channelId: string
  let messageId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
  })

  afterAll(async () => {
    if (channelId) await client.deleteChatChannel(channelId).catch(() => {})
  })

  it('lists channels', async () => {
    try {
      const channels = await client.getChatChannels()
      expect(Array.isArray(channels)).toBe(true)
    } catch (err) {
      if (err instanceof Error && err.message.includes('plan is limited')) return
      throw err
    }
  })

  it('creates a channel', async () => {
    try {
      const channel = await client.createChatChannel(`E2E Chat ${Date.now().toString(36)}`)
      channelId = channel.id
      expect(channel.id).toBeTypeOf('string')
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('plan is limited') || err.message.includes('403'))
      )
        return
      throw err
    }
  })

  it('sends a message', async () => {
    if (!channelId) return
    const msg = await client.sendChatMessage(channelId, 'E2E test message')
    messageId = msg.id
    expect(msg.id).toBeTypeOf('string')
  })

  it('lists messages', async () => {
    if (!channelId) return
    const messages = await client.getChatMessages(channelId)
    expect(messages.length).toBeGreaterThan(0)
  })

  it('adds a reaction', async () => {
    if (!messageId) return
    await expect(client.createChatMessageReaction(messageId, 'thumbsup')).resolves.not.toThrow()
  })

  it('lists reactions', async () => {
    if (!messageId) return
    const reactions = await client.getChatMessageReactions(messageId)
    expect(reactions.length).toBeGreaterThan(0)
  })

  it('replies to message', async () => {
    if (!messageId) return
    const reply = await client.createChatMessageReply(messageId, 'E2E reply')
    expect(reply.id).toBeTypeOf('string')
  })

  it('lists replies', async () => {
    if (!messageId) return
    const replies = await client.getChatMessageReplies(messageId)
    expect(replies.length).toBeGreaterThan(0)
  })

  it('deletes the channel', async () => {
    if (!channelId) return
    await expect(client.deleteChatChannel(channelId)).resolves.not.toThrow()
    channelId = ''
  })
})
