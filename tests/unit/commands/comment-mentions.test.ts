import { describe, it, expect, vi } from 'vitest'
import type { ClickUpClient } from '../../../src/api.js'

describe('resolveMemberId', () => {
  it('passes through a numeric id without calling the client', async () => {
    const { resolveMemberId } = await import('../../../src/commands/comment.js')
    const client = {} as ClickUpClient
    const id = await resolveMemberId(client, 'team1', '158675336')
    expect(id).toBe(158675336)
  })

  it('resolves "me" via getMe', async () => {
    const { resolveMemberId } = await import('../../../src/commands/comment.js')
    const getMe = vi.fn().mockResolvedValue({ id: 42, username: 'me' })
    const client = { getMe } as unknown as ClickUpClient
    const id = await resolveMemberId(client, 'team1', 'me')
    expect(id).toBe(42)
    expect(getMe).toHaveBeenCalledOnce()
  })

  it('resolves by email case-insensitively', async () => {
    const { resolveMemberId } = await import('../../../src/commands/comment.js')
    const getWorkspaceMembers = vi
      .fn()
      .mockResolvedValue([{ id: 7, username: 'alice', email: 'Alice@example.com' }])
    const client = { getWorkspaceMembers } as unknown as ClickUpClient
    const id = await resolveMemberId(client, 'team1', 'alice@example.com')
    expect(id).toBe(7)
  })

  it('resolves by username case-insensitively', async () => {
    const { resolveMemberId } = await import('../../../src/commands/comment.js')
    const getWorkspaceMembers = vi
      .fn()
      .mockResolvedValue([{ id: 9, username: 'Bob', email: 'bob@example.com' }])
    const client = { getWorkspaceMembers } as unknown as ClickUpClient
    const id = await resolveMemberId(client, 'team1', 'bob')
    expect(id).toBe(9)
  })

  it('throws a helpful error listing available members when not found', async () => {
    const { resolveMemberId } = await import('../../../src/commands/comment.js')
    const getWorkspaceMembers = vi
      .fn()
      .mockResolvedValue([{ id: 9, username: 'Bob', email: 'bob@example.com' }])
    const client = { getWorkspaceMembers } as unknown as ClickUpClient
    await expect(resolveMemberId(client, 'team1', 'nobody')).rejects.toThrow(
      'Member "nobody" not found. Available: Bob (bob@example.com)',
    )
  })
})

describe('createCachedMemberResolver', () => {
  it('fetches workspace members only once across multiple resolutions', async () => {
    const { createCachedMemberResolver } = await import('../../../src/commands/comment.js')
    const getWorkspaceMembers = vi.fn().mockResolvedValue([
      { id: 1, username: 'alice', email: 'alice@example.com' },
      { id: 2, username: 'bob', email: 'bob@example.com' },
    ])
    const client = { getWorkspaceMembers } as unknown as ClickUpClient
    const resolve = createCachedMemberResolver(client, 'team1')
    expect(await resolve('alice')).toBe(1)
    expect(await resolve('bob')).toBe(2)
    expect(getWorkspaceMembers).toHaveBeenCalledOnce()
  })

  it('does not call getWorkspaceMembers for numeric ids', async () => {
    const { createCachedMemberResolver } = await import('../../../src/commands/comment.js')
    const getWorkspaceMembers = vi.fn().mockResolvedValue([])
    const client = { getWorkspaceMembers } as unknown as ClickUpClient
    const resolve = createCachedMemberResolver(client, 'team1')
    expect(await resolve('123')).toBe(123)
    expect(getWorkspaceMembers).not.toHaveBeenCalled()
  })
})

describe('buildCommentBlocks', () => {
  it('returns only the message blocks when there are no mentions', async () => {
    const { buildCommentBlocks } = await import('../../../src/commands/comment.js')
    const blocks = buildCommentBlocks('hello', [])
    expect(blocks).toEqual([{ text: 'hello' }, { text: '\n' }])
  })

  it('prepends a single mention before the message', async () => {
    const { buildCommentBlocks } = await import('../../../src/commands/comment.js')
    const blocks = buildCommentBlocks('hello', [42])
    expect(blocks).toEqual([
      { type: 'tag', user: { id: 42 } },
      { text: ' ' },
      { text: 'hello' },
      { text: '\n' },
    ])
  })

  it('prepends multiple mentions in order', async () => {
    const { buildCommentBlocks } = await import('../../../src/commands/comment.js')
    const blocks = buildCommentBlocks('hi', [1, 2])
    expect(blocks).toEqual([
      { type: 'tag', user: { id: 1 } },
      { text: ' ' },
      { type: 'tag', user: { id: 2 } },
      { text: ' ' },
      { text: 'hi' },
      { text: '\n' },
    ])
  })

  it('keeps markdown formatting in the message after mentions', async () => {
    const { buildCommentBlocks } = await import('../../../src/commands/comment.js')
    const blocks = buildCommentBlocks('**bold**', [5])
    expect(blocks).toEqual([
      { type: 'tag', user: { id: 5 } },
      { text: ' ' },
      { text: 'bold', attributes: { bold: true } },
      { text: '\n' },
    ])
  })
})
