import { execFileSync } from 'node:child_process'
import { checkbox, confirm, Separator } from '@inquirer/prompts'
import chalk from 'chalk'
import type { CustomField, Task } from './api.js'
import type { TaskSummary } from './commands/tasks.js'
import { formatDate, formatDuration } from './date.js'
import { colorStatus, colorPriority, colorDueDate } from './output.js'

export const vimTheme = { keybindings: ['vim'] as const }

export function openUrl(url: string): void {
  switch (process.platform) {
    case 'darwin':
      execFileSync('open', [url])
      break
    case 'linux':
      execFileSync('xdg-open', [url])
      break
    case 'win32':
      execFileSync('cmd', ['/c', 'start', '', url])
      break
    default:
      process.stderr.write(`Cannot open browser on ${process.platform}. Visit: ${url}\n`)
  }
}

function descriptionPreview(text: string, maxLines = 3): string {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const preview = lines.slice(0, maxLines)
  const result = preview
    .map(l => `  ${chalk.dim(l.length > 100 ? l.slice(0, 99) + '\u2026' : l)}`)
    .join('\n')
  if (lines.length > maxLines)
    return result + `\n  ${chalk.dim(`... (${lines.length - maxLines} more lines)`)}`
  return result
}

function stringifyFieldValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function optionDisplayName(option: { name?: string; label?: string }): string | undefined {
  return option.label ?? option.name
}

function dropdownOptionName(option: { name?: string; label?: string }): string | undefined {
  return option.name ?? option.label
}

export function formatCustomFieldValue(field: CustomField): string | null {
  if (field.value === null || field.value === undefined) return null

  const options = field.type_config?.options

  switch (field.type) {
    case 'drop_down': {
      if (!options) return stringifyFieldValue(field.value)
      const match = options.find(o => o.orderindex === Number(field.value))
      return match
        ? (dropdownOptionName(match) ?? stringifyFieldValue(field.value))
        : stringifyFieldValue(field.value)
    }
    case 'labels': {
      if (!Array.isArray(field.value) || !options) return stringifyFieldValue(field.value)
      const names = (field.value as string[])
        .map(id => {
          const match = options.find(o => o.id === id)
          return match ? optionDisplayName(match) : undefined
        })
        .filter((n): n is string => n !== undefined)
      return names.length > 0 ? names.join(', ') : null
    }
    case 'date': {
      const ts = Number(field.value)
      if (!Number.isFinite(ts)) return stringifyFieldValue(field.value)
      return formatDate(String(ts))
    }
    case 'checkbox':
      return field.value === true || field.value === 'true' ? 'Yes' : 'No'
    default:
      return stringifyFieldValue(field.value)
  }
}

export function formatTaskDetail(task: Task): string {
  const lines: string[] = []
  const isInitiative = (task.custom_item_id ?? 0) !== 0
  const typeLabel = isInitiative ? 'initiative' : 'task'

  lines.push(chalk.bold.underline(task.name))
  lines.push('')

  const fields: Array<[string, string | undefined]> = [
    ['ID', task.id],
    ['Status', task.status?.status ? colorStatus(task.status.status) : undefined],
    ['Type', typeLabel],
    ['List', task.list?.name],
    [
      'Assignees',
      task.assignees?.length ? task.assignees.map(a => a.username).join(', ') : undefined,
    ],
    ['Priority', task.priority?.priority ? colorPriority(task.priority.priority) : undefined],
    ['Start', task.start_date ? formatDate(task.start_date) : undefined],
    ['Due', task.due_date ? colorDueDate(formatDate(task.due_date), task.due_date) : undefined],
    ['Estimate', task.time_estimate ? formatDuration(task.time_estimate) : undefined],
    ['Tracked', task.time_spent ? formatDuration(task.time_spent) : undefined],
    ['Tags', task.tags?.length ? task.tags.map(t => t.name).join(', ') : undefined],
    ['Lists', task.locations?.length ? task.locations.map(l => l.name).join(', ') : undefined],
    ['Parent', task.parent || undefined],
    ['URL', task.url],
  ]

  const maxLabel = Math.max(...fields.filter(([, v]) => v).map(([k]) => k.length))
  for (const [label, value] of fields) {
    if (!value) continue
    lines.push(`  ${chalk.bold(label.padEnd(maxLabel + 1))} ${value}`)
  }

  if (task.custom_fields?.length) {
    const formatted = task.custom_fields
      .map(f => [f.name, formatCustomFieldValue(f)] as const)
      .filter((pair): pair is [string, string] => pair[1] !== null)
    if (formatted.length > 0) {
      lines.push('')
      lines.push(chalk.bold('Custom Fields'))
      for (const [name, value] of formatted) {
        lines.push(`  ${chalk.bold(name)}  ${value}`)
      }
    }
  }

  if (task.checklists?.length) {
    lines.push('')
    lines.push(chalk.bold('Checklists'))
    for (const cl of task.checklists) {
      const resolved = cl.items.filter(i => i.resolved).length
      lines.push(`  ${chalk.bold(cl.name)} (${resolved}/${cl.items.length})`)
      for (const item of cl.items) {
        const check = item.resolved ? chalk.green('[x]') : chalk.dim('[ ]')
        lines.push(`    ${check} ${item.name}`)
      }
    }
  }

  if (task.attachments?.length) {
    lines.push('')
    lines.push(chalk.bold('Attachments'))
    for (const att of task.attachments) {
      lines.push(`  ${att.title} ${chalk.dim(att.url)}`)
    }
  }

  if (task.dependencies?.length) {
    lines.push('')
    lines.push(chalk.bold('Dependencies'))
    for (const dep of task.dependencies) {
      const direction = dep.depends_on === task.id ? 'blocks' : 'depends on'
      const otherId = dep.depends_on === task.id ? dep.task_id : dep.depends_on
      lines.push(`  ${direction} ${chalk.dim(otherId)}`)
    }
  }

  if (task.linked_tasks?.length) {
    lines.push('')
    lines.push(chalk.bold('Linked Tasks'))
    for (const lt of task.linked_tasks) {
      lines.push(`  ${chalk.dim(lt.task_id)}`)
    }
  }

  if (task.text_content?.trim()) {
    lines.push('')
    lines.push(descriptionPreview(task.text_content))
  }

  return lines.join('\n')
}

function formatChoiceName(task: TaskSummary): string {
  const id = task.id.padEnd(12)
  const name = task.name.length > 50 ? task.name.slice(0, 49) + '\u2026' : task.name.padEnd(50)
  const status = colorStatus(task.status)
  const priority = task.priority !== 'none' ? colorPriority(task.priority) : ''
  return `${id}  ${name}  ${status}${priority ? '  ' + priority : ''}`
}

export async function interactiveTaskPicker(tasks: TaskSummary[]): Promise<TaskSummary[]> {
  if (tasks.length === 0) return []

  const selected = await checkbox<string>({
    message: `${tasks.length} task(s) found. Select to view details / open in browser:`,
    choices: tasks.map(t => ({
      name: formatChoiceName(t),
      value: t.id,
    })),
    pageSize: 20,
    theme: vimTheme,
  })

  return tasks.filter(t => selected.includes(t.id))
}

export async function groupedTaskPicker(
  groups: Array<{ label: string; tasks: TaskSummary[] }>,
): Promise<TaskSummary[]> {
  const allTasks = groups.flatMap(g => g.tasks)
  const totalCount = allTasks.length
  if (totalCount === 0) return []

  const choices: Array<{ name: string; value: string } | Separator> = []
  for (const group of groups) {
    if (group.tasks.length === 0) continue
    choices.push(new Separator(chalk.bold(`${group.label} (${group.tasks.length})`)))
    for (const task of group.tasks) {
      choices.push({ name: formatChoiceName(task), value: task.id })
    }
  }

  const selected = await checkbox<string>({
    message: `${totalCount} task(s) found. Select to view details / open in browser:`,
    choices,
    pageSize: 20,
    theme: vimTheme,
  })

  return allTasks.filter(t => selected.includes(t.id))
}

export async function showDetailsAndOpen(
  tasks: TaskSummary[],
  fetchTask?: (id: string) => Promise<Task>,
): Promise<void> {
  if (tasks.length === 0) return

  const separator = chalk.dim('\u2500'.repeat(60))

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!
    if (i > 0) {
      console.log('')
      console.log(separator)
    }
    console.log('')

    if (fetchTask) {
      const full = await fetchTask(task.id)
      console.log(formatTaskDetail(full))
    } else {
      const fallback: Task = {
        id: task.id,
        name: task.name,
        status: { status: task.status, color: '' },
        custom_item_id: task.task_type === 'initiative' ? 1 : 0,
        assignees: [],
        url: task.url,
        list: { id: '', name: task.list },
        parent: task.parent,
      }
      console.log(formatTaskDetail(fallback))
    }
  }

  const urls = tasks.map(t => t.url)
  console.log('')
  const shouldOpen = await confirm({
    message: `Open ${urls.length} task(s) in browser?`,
    default: true,
  })

  if (shouldOpen) {
    for (const url of urls) {
      openUrl(url)
    }
  }
}
