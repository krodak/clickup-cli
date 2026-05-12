import chalk from 'chalk'
import type { ChatMessage } from '../api.js'
import { formatTimestamp } from '../date.js'

const separator = chalk.dim('-'.repeat(60))

export function formatMessages(messages: ChatMessage[]): string {
  if (messages.length === 0) return 'No messages'
  const lines: string[] = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    if (i > 0) lines.push(separator)
    const meta = [chalk.bold(`@${msg.user_id}`), chalk.dim(formatTimestamp(msg.date))]
    if (msg.replies_count) {
      meta.push(chalk.dim(`${msg.replies_count} replies`))
    }
    meta.push(chalk.dim(`(${msg.id})`))
    lines.push(meta.join('  '))
    if (msg.type === 'post' && msg.post_data?.title) {
      lines.push(chalk.cyan.bold(msg.post_data.title))
    }
    lines.push(msg.content)
  }
  return lines.join('\n')
}

export function formatMessagesMarkdown(messages: ChatMessage[]): string {
  if (messages.length === 0) return 'No messages'
  return messages
    .map(msg => {
      const date = new Date(msg.date).toISOString()
      const title =
        msg.type === 'post' && msg.post_data?.title ? ` — **${msg.post_data.title}**` : ''
      return `### @${msg.user_id} (${msg.id})${title}\n_${date}_\n\n${msg.content}`
    })
    .join('\n\n---\n\n')
}
