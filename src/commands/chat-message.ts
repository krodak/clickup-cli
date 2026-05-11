import chalk from 'chalk'
import type { ChatMessage } from '../api.js'

export function formatMessages(messages: ChatMessage[]): string {
  if (messages.length === 0) return 'No messages'
  const lines: string[] = []
  for (const msg of messages) {
    const date = new Date(msg.date).toLocaleString()
    const header = [chalk.bold(`@${msg.user_id}`), chalk.dim(date), chalk.dim(`(${msg.id})`)]
    if (msg.type === 'post' && msg.post_data?.title) {
      header.push(chalk.cyan(`[${msg.post_data.title}]`))
    }
    if (msg.replies_count) {
      header.push(chalk.dim(`${msg.replies_count} replies`))
    }
    lines.push(header.join('  '))
    lines.push(`  ${msg.content}`)
    lines.push('')
  }
  return lines.join('\n').trimEnd()
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
