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
): Promise<Checklist> {
  const client = new ClickUpClient(config)
  return client.createChecklistItem(checklistId, name)
}

export async function editChecklistItem(
  config: Config,
  checklistId: string,
  checklistItemId: string,
  updates: { name?: string; resolved?: boolean; assignee?: number | null },
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

export function formatChecklists(checklists: Checklist[]): string {
  if (checklists.length === 0) return 'No checklists'
  const lines: string[] = []
  for (const cl of checklists) {
    const resolved = cl.items.filter(i => i.resolved).length
    lines.push(chalk.bold(`${cl.name} (${resolved}/${cl.items.length})`))
    lines.push(chalk.dim(`  ID: ${cl.id}`))
    for (const item of cl.items) {
      const check = item.resolved ? chalk.green('[x]') : chalk.dim('[ ]')
      const assignee = item.assignee ? chalk.dim(` @${item.assignee.username}`) : ''
      lines.push(`  ${check} ${item.name}${assignee}`)
      lines.push(chalk.dim(`      item-id: ${item.id}`))
    }
  }
  return lines.join('\n')
}

export function formatChecklistsMarkdown(checklists: Checklist[]): string {
  if (checklists.length === 0) return 'No checklists'
  return checklists
    .map(cl => {
      const resolved = cl.items.filter((i: ChecklistItem) => i.resolved).length
      const header = `### ${cl.name} (${resolved}/${cl.items.length})`
      const items = cl.items.map(
        (item: ChecklistItem) => `- [${item.resolved ? 'x' : ' '}] ${item.name}`,
      )
      return [header, '', ...items].join('\n')
    })
    .join('\n\n')
}
