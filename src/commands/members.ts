import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Member } from '../api.js'

export async function listMembers(config: Config): Promise<Member[]> {
  const client = new ClickUpClient(config)
  return client.getWorkspaceMembers(config.teamId)
}

export function formatMembers(members: Member[]): string {
  if (members.length === 0) return 'No members found'
  return members
    .map(m => `${chalk.bold(m.username)} ${chalk.dim(`(${m.id})`)} ${m.email}`)
    .join('\n')
}

export function formatMembersMarkdown(members: Member[]): string {
  if (members.length === 0) return 'No members found'
  return members.map(m => `- **${m.username}** (${m.id}) - ${m.email}`).join('\n')
}
