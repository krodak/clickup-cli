import chalk from 'chalk'
import type { ChatChannel, ChatMember } from '../api.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'
import { formatDate } from '../date.js'

function channelName(c: ChatChannel): string {
  return c.name || 'DM'
}

function colorChannelType(type: string): string {
  if (type === 'CHANNEL') return chalk.cyan(type)
  if (type === 'DM') return chalk.dim(type)
  if (type === 'GROUP_DM') return chalk.blue(type)
  return type
}

function colorVisibility(v: string): string {
  if (v === 'PUBLIC') return chalk.green(v)
  return chalk.dim(v)
}

interface ChannelRow {
  id: string
  name: string
  type: string
  visibility: string
  topic: string
}

const CHANNEL_COLUMNS: Column<ChannelRow>[] = [
  { key: 'name', label: 'Name', maxWidth: 40, format: v => chalk.bold(v) },
  { key: 'id', label: 'ID', maxWidth: 20, format: v => chalk.dim(v) },
  { key: 'type', label: 'Type', maxWidth: 12, format: v => colorChannelType(v) },
  { key: 'visibility', label: 'Visibility', maxWidth: 10, format: v => colorVisibility(v) },
  { key: 'topic', label: 'Topic', maxWidth: 40 },
]

export function formatChannelsTable(channels: ChatChannel[]): string {
  if (channels.length === 0) return 'No channels found'
  const rows: ChannelRow[] = channels.map(c => ({
    id: c.id,
    name: channelName(c),
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
      const name = channelName(c)
      return `- **${name}** (${c.id}) — ${c.type}${c.topic ? `, ${c.topic}` : ''}`
    })
    .join('\n')
}

export function formatChannelDetail(channel: ChatChannel): string {
  const lines: string[] = []
  lines.push(chalk.bold.underline(channelName(channel)))
  lines.push('')

  const fields: Array<[string, string]> = [
    ['ID', chalk.dim(channel.id)],
    ['Type', colorChannelType(channel.type)],
    ['Visibility', colorVisibility(channel.visibility)],
  ]
  if (channel.topic) fields.push(['Topic', channel.topic])
  if (channel.description) fields.push(['Description', channel.description])
  fields.push(['Archived', channel.archived ? chalk.yellow('Yes') : 'No'])
  fields.push(['Created', formatDate(channel.created_at)])

  const maxLabel = Math.max(...fields.map(([k]) => k.length))
  for (const [label, value] of fields) {
    lines.push(`  ${chalk.bold(label.padEnd(maxLabel + 1))} ${value}`)
  }
  return lines.join('\n')
}

interface ChatMemberRow {
  name: string
  id: string
  email: string
  type: string
}

const CHAT_MEMBER_COLUMNS: Column<ChatMemberRow>[] = [
  { key: 'name', label: 'Name', maxWidth: 30, format: v => chalk.bold(v) },
  { key: 'id', label: 'ID', maxWidth: 15, format: v => chalk.dim(v) },
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
