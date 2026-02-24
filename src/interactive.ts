import { execFileSync } from 'node:child_process'
import { checkbox, confirm, Separator } from '@inquirer/prompts'
import chalk from 'chalk'
import type { Task } from './api.js'
import type { TaskSummary } from './commands/tasks.js'

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

function formatMs(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

function formatTimestamp(ts: string): string {
  return new Date(Number(ts)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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

export function formatTaskDetail(task: Task): string {
  const lines: string[] = []
  const isInitiative = (task.custom_item_id ?? 0) !== 0
  const typeLabel = isInitiative ? 'initiative' : 'task'

  lines.push(chalk.bold.underline(task.name))
  lines.push('')

  const fields: Array<[string, string | undefined]> = [
    ['ID', task.id],
    ['Status', task.status?.status],
    ['Type', typeLabel],
    ['List', task.list?.name],
    [
      'Assignees',
      task.assignees?.length ? task.assignees.map(a => a.username).join(', ') : undefined,
    ],
    ['Priority', task.priority?.priority],
    ['Start', task.start_date ? formatTimestamp(task.start_date) : undefined],
    ['Due', task.due_date ? formatTimestamp(task.due_date) : undefined],
    ['Estimate', task.time_estimate ? formatMs(task.time_estimate) : undefined],
    ['Tracked', task.time_spent ? formatMs(task.time_spent) : undefined],
    ['Tags', task.tags?.length ? task.tags.map(t => t.name).join(', ') : undefined],
    ['Parent', task.parent || undefined],
    ['URL', task.url],
  ]

  const maxLabel = Math.max(...fields.filter(([, v]) => v).map(([k]) => k.length))
  for (const [label, value] of fields) {
    if (!value) continue
    lines.push(`  ${chalk.bold(label.padEnd(maxLabel + 1))} ${value}`)
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
  const status = task.status
  return `${id}  ${name}  ${chalk.dim(status)}`
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
