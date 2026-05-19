import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { SharedHierarchy } from '../api.js'

export async function fetchSharedHierarchy(config: Config): Promise<SharedHierarchy> {
  const client = new ClickUpClient(config)
  return client.getSharedHierarchy()
}

export function formatSharedHierarchy(hierarchy: SharedHierarchy): string {
  const { spaces, folders, lists } = hierarchy.shared
  if (spaces.length === 0 && folders.length === 0 && lists.length === 0) {
    return 'No shared items found.'
  }

  const lines: string[] = []

  if (spaces.length > 0) {
    lines.push(chalk.bold('Spaces'))
    for (const s of spaces) {
      lines.push(`  ${s.name}  ${chalk.dim(s.id)}`)
    }
  }

  if (folders.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push(chalk.bold('Folders'))
    for (const f of folders) {
      lines.push(`  ${f.name}  ${chalk.dim(f.id)}`)
    }
  }

  if (lists.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push(chalk.bold('Lists'))
    for (const l of lists) {
      lines.push(`  ${l.name}  ${chalk.dim(l.id)}`)
    }
  }

  return lines.join('\n')
}

export function formatSharedHierarchyMarkdown(hierarchy: SharedHierarchy): string {
  const { spaces, folders, lists } = hierarchy.shared
  if (spaces.length === 0 && folders.length === 0 && lists.length === 0) {
    return 'No shared items found.'
  }

  const lines: string[] = ['# Shared Hierarchy', '']

  if (spaces.length > 0) {
    lines.push('## Spaces', '')
    for (const s of spaces) {
      lines.push(`- **${s.name}** (${s.id})`)
    }
    lines.push('')
  }

  if (folders.length > 0) {
    lines.push('## Folders', '')
    for (const f of folders) {
      lines.push(`- **${f.name}** (${f.id})`)
    }
    lines.push('')
  }

  if (lists.length > 0) {
    lines.push('## Lists', '')
    for (const l of lists) {
      lines.push(`- **${l.name}** (${l.id})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
