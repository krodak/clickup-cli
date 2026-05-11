import chalk from 'chalk'
import type { ChatReaction } from '../api.js'

function groupByEmoji(reactions: ChatReaction[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const r of reactions) {
    const users = groups.get(r.reaction) ?? []
    users.push(r.user_id)
    groups.set(r.reaction, users)
  }
  return groups
}

export function formatReactions(reactions: ChatReaction[]): string {
  if (reactions.length === 0) return 'No reactions'
  const groups = groupByEmoji(reactions)
  const lines: string[] = []
  for (const [emoji, users] of groups) {
    lines.push(`${chalk.bold(`:${emoji}:`)}  ${users.join(', ')}`)
  }
  return lines.join('\n')
}

export function formatReactionsMarkdown(reactions: ChatReaction[]): string {
  if (reactions.length === 0) return 'No reactions'
  const groups = groupByEmoji(reactions)
  const lines: string[] = []
  for (const [emoji, users] of groups) {
    lines.push(`- **:${emoji}:** ${users.join(', ')}`)
  }
  return lines.join('\n')
}
