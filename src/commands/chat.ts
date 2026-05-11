import chalk from 'chalk'
import type { ChatChannel, ChatMember } from '../api.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface ChannelRow {
  id: string
  name: string
  type: string
  visibility: string
  topic: string
}

const CHANNEL_COLUMNS: Column<ChannelRow>[] = [
  { key: 'id', label: 'ID', maxWidth: 20 },
  { key: 'name', label: 'Name', maxWidth: 40 },
  { key: 'type', label: 'Type', maxWidth: 12 },
  { key: 'visibility', label: 'Visibility', maxWidth: 10 },
  { key: 'topic', label: 'Topic', maxWidth: 40 },
]

export function formatChannelsTable(channels: ChatChannel[]): string {
  if (channels.length === 0) return 'No channels found'
  const rows: ChannelRow[] = channels.map(c => ({
    id: c.id,
    name: c.name || '(unnamed)',
    type: c.type,
    visibility: c.visibility,
    topic: c.topic ?? '',
  }))
  return formatTable(rows, CHANNEL_COLUMNS)
}

export function formatChannelsMarkdown(channels: ChatChannel[]): string {
  if (channels.length === 0) return 'No channels found'
  return channels
    .map(c => {
      const name = c.name || '(unnamed)'
      return `- **${name}** (${c.id}) — ${c.type}${c.topic ? `, ${c.topic}` : ''}`
    })
    .join('\n')
}

export function formatChannelDetail(channel: ChatChannel): string {
  const lines: string[] = []
  lines.push(chalk.bold(channel.name || '(unnamed)'))
  lines.push(chalk.dim(`ID: ${channel.id}`))
  lines.push(`Type: ${channel.type}`)
  lines.push(`Visibility: ${channel.visibility}`)
  if (channel.topic) lines.push(`Topic: ${channel.topic}`)
  if (channel.description) lines.push(`Description: ${channel.description}`)
  lines.push(`Archived: ${channel.archived}`)
  lines.push(`Created: ${channel.created_at}`)
  return lines.join('\n')
}

interface ChatMemberRow {
  name: string
  id: string
  email: string
  type: string
}

const CHAT_MEMBER_COLUMNS: Column<ChatMemberRow>[] = [
  { key: 'name', label: 'Name', maxWidth: 30 },
  { key: 'id', label: 'ID', maxWidth: 15 },
  { key: 'email', label: 'Email', maxWidth: 40 },
  { key: 'type', label: 'Type', maxWidth: 12 },
]

export function formatChatMembers(members: ChatMember[]): string {
  if (members.length === 0) return 'No members found'
  const rows: ChatMemberRow[] = members.map(m => ({
    name: m.user.username ?? m.user.name ?? m.user.id,
    id: m.user.id,
    email: m.user.email,
    type: m.type,
  }))
  return formatTable(rows, CHAT_MEMBER_COLUMNS)
}

export function formatChatMembersMarkdown(members: ChatMember[]): string {
  if (members.length === 0) return 'No members found'
  return members
    .map(m => {
      const name = m.user.username ?? m.user.name ?? m.user.id
      return `- **${name}** (${m.user.id}) — ${m.user.email}`
    })
    .join('\n')
}
