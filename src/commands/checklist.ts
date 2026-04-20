import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Checklist, ChecklistItem } from '../api.js'
import type { Config } from '../config.js'

export async function viewChecklists(config: Config, taskId: string): Promise<Checklist[]> {
  const client = new ClickUpClient(config)
  const task = await client.getTask(taskId)
  return task.checklists ?? []
}

export async function createChecklist(
  config: Config,
  taskId: string,
  name: string,
): Promise<Checklist> {
  const client = new ClickUpClient(config)
  return client.createChecklist(taskId, name)
}

export async function deleteChecklist(
  config: Config,
  checklistId: string,
): Promise<{ checklistId: string }> {
  const client = new ClickUpClient(config)
  await client.deleteChecklist(checklistId)
  return { checklistId }
}

export async function addChecklistItem(
  config: Config,
  checklistId: string,
  name: string,
  parent?: string | null,
): Promise<Checklist> {
  const client = new ClickUpClient(config)
  return client.createChecklistItem(checklistId, name, parent)
}

export async function editChecklistItem(
  config: Config,
  checklistId: string,
  checklistItemId: string,
  updates: {
    name?: string
    resolved?: boolean
    assignee?: number | null
    parent?: string | null
  },
): Promise<Checklist> {
  const client = new ClickUpClient(config)
  return client.editChecklistItem(checklistId, checklistItemId, updates)
}

export async function deleteChecklistItem(
  config: Config,
  checklistId: string,
  checklistItemId: string,
): Promise<{ checklistId: string; checklistItemId: string }> {
  const client = new ClickUpClient(config)
  await client.deleteChecklistItem(checklistId, checklistItemId)
  return { checklistId, checklistItemId }
}

function sortByOrder(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => (a.orderindex ?? 0) - (b.orderindex ?? 0))
}

function countItems(items: ChecklistItem[]): { total: number; resolved: number } {
  let total = 0
  let resolved = 0
  for (const item of items) {
    total++
    if (item.resolved) resolved++
    if (item.children?.length) {
      const nested = countItems(item.children)
      total += nested.total
      resolved += nested.resolved
    }
  }
  return { total, resolved }
}

export function formatChecklists(checklists: Checklist[]): string {
  if (checklists.length === 0) return 'No checklists'
  const lines: string[] = []
  const renderItem = (item: ChecklistItem, depth: number): void => {
    const indent = '  '.repeat(depth + 1)
    const check = item.resolved ? chalk.green('[x]') : chalk.dim('[ ]')
    const name = item.resolved ? chalk.dim(item.name) : item.name
    const assignee = item.assignee ? chalk.dim(` @${item.assignee.username}`) : ''
    lines.push(`${indent}${check} ${name}${assignee}`)
    lines.push(chalk.dim(`${indent}    item-id: ${item.id}`))
    for (const child of sortByOrder(item.children ?? [])) {
      renderItem(child, depth + 1)
    }
  }
  for (const cl of checklists) {
    const { total, resolved } = countItems(cl.items)
    lines.push(chalk.bold(`${cl.name} (${resolved}/${total})`))
    lines.push(chalk.dim(`  ID: ${cl.id}`))
    for (const item of sortByOrder(cl.items)) renderItem(item, 0)
  }
  return lines.join('\n')
}

export function formatChecklistsMarkdown(checklists: Checklist[]): string {
  if (checklists.length === 0) return 'No checklists'
  const renderItem = (item: ChecklistItem, depth: number): string[] => {
    const indent = '  '.repeat(depth)
    const lines = [`${indent}- [${item.resolved ? 'x' : ' '}] ${item.name}`]
    for (const child of sortByOrder(item.children ?? [])) {
      lines.push(...renderItem(child, depth + 1))
    }
    return lines
  }
  return checklists
    .map(cl => {
      const { total, resolved } = countItems(cl.items)
      const header = `### ${cl.name} (${resolved}/${total})`
      const items = sortByOrder(cl.items).flatMap(item => renderItem(item, 0))
      return [header, '', ...items].join('\n')
    })
    .join('\n\n')
}
