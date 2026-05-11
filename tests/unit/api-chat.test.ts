import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()

function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    headers: new Headers({ 'content-length': '1' }),
    json: () => Promise.resolve(data),
  })
}

function mock204() {
  return Promise.resolve({
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: new Headers(),
    json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
  })
}

const V3_BASE = 'https://api.clickup.com/api/v3'

describe('Chat channel management', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getChatChannels sends GET to v3 channels endpoint with query params', async () => {
    const channels = [{ id: 'ch1', name: 'General' }]
    mockFetch.mockReturnValue(mockResponse({ data: channels }))
    const result = await client.getChatChannels({ isFollower: true, limit: 10 })
    expect(result).toEqual(channels)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain(`${V3_BASE}/workspaces/team1/chat/channels`)
    expect(url).toContain('is_follower=true')
    expect(url).toContain('limit=10')
  })

  it('getChatChannels returns empty array when no params', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: [] }))
    const result = await client.getChatChannels()
    expect(result).toEqual([])
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels`)
  })

  it('getChatChannel sends GET to v3 channel detail endpoint', async () => {
    const channel = { id: 'ch1', name: 'General' }
    mockFetch.mockReturnValue(mockResponse({ data: channel }))
    const result = await client.getChatChannel('ch1')
    expect(result).toEqual(channel)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels/ch1`)
  })

  it('createChatChannel sends POST with name and options', async () => {
    const channel = { id: 'ch2', name: 'Dev' }
    mockFetch.mockReturnValue(mockResponse(channel))
    const result = await client.createChatChannel('Dev', {
      visibility: 'PRIVATE',
      topic: 'Development',
      userIds: ['u1', 'u2'],
    })
    expect(result).toEqual(channel)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.name).toBe('Dev')
    expect(body.visibility).toBe('PRIVATE')
    expect(body.topic).toBe('Development')
    expect(body.user_ids).toEqual(['u1', 'u2'])
  })

  it('createDirectMessage sends POST to direct_message endpoint', async () => {
    const channel = { id: 'dm1', name: 'DM' }
    mockFetch.mockReturnValue(mockResponse(channel))
    const result = await client.createDirectMessage(['u1', 'u2'])
    expect(result).toEqual(channel)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels/direct_message`)
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.user_ids).toEqual(['u1', 'u2'])
  })

  it('createLocationChannel sends POST to location endpoint', async () => {
    const channel = { id: 'loc1', name: 'Space Channel' }
    mockFetch.mockReturnValue(mockResponse(channel))
    const result = await client.createLocationChannel(
      { id: 'space1', type: 'space' },
      { description: 'Space chat', topic: 'General', visibility: 'PUBLIC', userIds: ['u1'] },
    )
    expect(result).toEqual(channel)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels/location`)
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.location).toEqual({ id: 'space1', type: 'space' })
    expect(body.description).toBe('Space chat')
    expect(body.topic).toBe('General')
    expect(body.visibility).toBe('PUBLIC')
    expect(body.user_ids).toEqual(['u1'])
  })

  it('updateChatChannel sends PATCH to channel endpoint', async () => {
    const channel = { id: 'ch1', name: 'Updated' }
    mockFetch.mockReturnValue(mockResponse(channel))
    const result = await client.updateChatChannel('ch1', { name: 'Updated', topic: 'New topic' })
    expect(result).toEqual(channel)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels/ch1`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.name).toBe('Updated')
    expect(body.topic).toBe('New topic')
  })

  it('deleteChatChannel sends DELETE to channel endpoint', async () => {
    mockFetch.mockReturnValue(mock204())
    await client.deleteChatChannel('ch1')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels/ch1`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('getChatChannelMembers sends GET to members endpoint', async () => {
    const members = [{ user: { id: 'u1', email: 'a@b.com' }, type: 'member' }]
    mockFetch.mockReturnValue(mockResponse({ data: members }))
    const result = await client.getChatChannelMembers('ch1', 25)
    expect(result).toEqual(members)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain(`${V3_BASE}/workspaces/team1/chat/channels/ch1/members`)
    expect(url).toContain('limit=25')
  })

  it('getChatChannelFollowers sends GET to followers endpoint', async () => {
    const followers = [{ user: { id: 'u2', email: 'c@d.com' }, type: 'follower' }]
    mockFetch.mockReturnValue(mockResponse({ data: followers }))
    const result = await client.getChatChannelFollowers('ch1', 50)
    expect(result).toEqual(followers)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain(`${V3_BASE}/workspaces/team1/chat/channels/ch1/followers`)
    expect(url).toContain('limit=50')
  })
})

describe('Chat messaging', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getChatMessages sends GET to messages endpoint', async () => {
    const messages = [{ id: 'm1', content: 'Hello' }]
    mockFetch.mockReturnValue(mockResponse({ data: messages }))
    const result = await client.getChatMessages('ch1', { limit: 20 })
    expect(result).toEqual(messages)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain(`${V3_BASE}/workspaces/team1/chat/channels/ch1/messages`)
    expect(url).toContain('limit=20')
  })

  it('sendChatMessage sends POST with content and markdown format', async () => {
    const message = { id: 'm2', content: 'Hi there' }
    mockFetch.mockReturnValue(mockResponse(message))
    const result = await client.sendChatMessage('ch1', 'Hi there')
    expect(result).toEqual(message)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/channels/ch1/messages`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.content).toBe('Hi there')
    expect(body.content_format).toBe('text/md')
    expect(body.type).toBe('message')
  })

  it('sendChatMessage sends post type with title', async () => {
    const message = { id: 'm3', content: 'Post body', type: 'post' }
    mockFetch.mockReturnValue(mockResponse(message))
    await client.sendChatMessage('ch1', 'Post body', { type: 'post', postTitle: 'My Post' })
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.type).toBe('post')
    expect(body.post_data).toEqual({ title: 'My Post' })
  })

  it('updateChatMessage sends PATCH to message endpoint', async () => {
    const message = { id: 'm1', content: 'Updated' }
    mockFetch.mockReturnValue(mockResponse(message))
    const result = await client.updateChatMessage('m1', 'Updated')
    expect(result).toEqual(message)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/messages/m1`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.content).toBe('Updated')
    expect(body.content_format).toBe('text/md')
  })

  it('deleteChatMessage sends DELETE to message endpoint', async () => {
    mockFetch.mockReturnValue(mock204())
    await client.deleteChatMessage('m1')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/messages/m1`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('Chat replies', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getChatMessageReplies sends GET to replies endpoint', async () => {
    const replies = [{ id: 'r1', content: 'Reply' }]
    mockFetch.mockReturnValue(mockResponse({ data: replies }))
    const result = await client.getChatMessageReplies('m1', { limit: 10 })
    expect(result).toEqual(replies)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain(`${V3_BASE}/workspaces/team1/chat/messages/m1/replies`)
    expect(url).toContain('limit=10')
  })

  it('createChatMessageReply sends POST to replies endpoint', async () => {
    const reply = { id: 'r2', content: 'My reply' }
    mockFetch.mockReturnValue(mockResponse(reply))
    const result = await client.createChatMessageReply('m1', 'My reply')
    expect(result).toEqual(reply)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/messages/m1/replies`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.content).toBe('My reply')
    expect(body.content_format).toBe('text/md')
    expect(body.type).toBe('message')
  })
})

describe('Chat reactions', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getChatMessageReactions sends GET to reactions endpoint', async () => {
    const reactions = [{ reaction: 'thumbsup', user_id: 'u1', date: 123 }]
    mockFetch.mockReturnValue(mockResponse({ data: reactions }))
    const result = await client.getChatMessageReactions('m1')
    expect(result).toEqual(reactions)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/messages/m1/reactions`)
  })

  it('createChatMessageReaction sends POST with emoji', async () => {
    const reaction = { reaction: 'thumbsup', user_id: 'u1', date: 123 }
    mockFetch.mockReturnValue(mockResponse(reaction))
    const result = await client.createChatMessageReaction('m1', 'thumbsup')
    expect(result).toEqual(reaction)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/messages/m1/reactions`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.reaction).toBe('thumbsup')
  })

  it('deleteChatMessageReaction sends DELETE to reaction endpoint', async () => {
    mockFetch.mockReturnValue(mock204())
    await client.deleteChatMessageReaction('m1', 'thumbsup')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe(`${V3_BASE}/workspaces/team1/chat/messages/m1/reactions/thumbsup`)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
