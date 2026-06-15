import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { markdownToCommentBlocks } from './comment-format.js'
import type { CommentBlock } from './comment-format.js'

export async function resolveMemberId(
  client: ClickUpClient,
  teamId: string,
  value: string,
): Promise<number> {
  if (/^\d+$/.test(value)) return Number(value)
  if (value === 'me') return (await client.getMe()).id
  const members = await client.getWorkspaceMembers(teamId)
  const match = members.find(
    m =>
      m.email?.toLowerCase() === value.toLowerCase() ||
      m.username?.toLowerCase() === value.toLowerCase(),
  )
  if (match) return match.id
  const available = members.map(m => `${m.username} (${m.email})`).join(', ')
  throw new Error(`Member "${value}" not found. Available: ${available}`)
}

export function createCachedMemberResolver(
  client: ClickUpClient,
  teamId: string,
): (value: string) => Promise<number> {
  let membersCache: import('../api.js').Member[] | null = null
  const cachingClient = {
    getMe: () => client.getMe(),
    getWorkspaceMembers: async (): Promise<import('../api.js').Member[]> => {
      if (membersCache === null) membersCache = await client.getWorkspaceMembers(teamId)
      return membersCache
    },
  } as unknown as ClickUpClient
  return (value: string) => resolveMemberId(cachingClient, teamId, value)
}

export function buildCommentBlocks(message: string, mentionIds: number[]): CommentBlock[] {
  const messageBlocks = markdownToCommentBlocks(message)
  if (mentionIds.length === 0) return messageBlocks
  const mentionBlocks: CommentBlock[] = []
  for (const id of mentionIds) {
    mentionBlocks.push({ type: 'tag', user: { id } })
    mentionBlocks.push({ text: ' ' })
  }
  return [...mentionBlocks, ...messageBlocks]
}

export async function postComment(
  config: Config,
  taskId: string,
  text: string,
  notifyAll?: boolean,
  mentionIds?: number[],
): Promise<{ id: string }> {
  if (!text.trim()) throw new Error('Comment text cannot be empty')
  const client = new ClickUpClient(config)
  const blocks = buildCommentBlocks(text, mentionIds ?? [])
  return client.postComment(taskId, text, notifyAll, blocks)
}
