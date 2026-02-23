import { checkbox, confirm } from '@inquirer/prompts'
import chalk from 'chalk'
import type { Task } from './api.js'
import type { TaskSummary } from './commands/tasks.js'

function formatMs(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

function formatTimestamp(ts: string): string {
  return new Date(Number(ts)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

function descriptionPreview(text: string, maxLines = 3): string {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const preview = lines.slice(0, maxLines)
  const result = preview.map(l => `  ${chalk.dim(l.length > 100 ? l.slice(0, 99) + '\u2026' : l)}`).join('\n')
  if (lines.length > maxLines) return result + `\n  ${chalk.dim(`... (${lines.length - maxLines} more lines)`)}`
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
    ['Assignees', task.assignees?.length ? task.assignees.map(a => a.username).join(', ') : undefined],
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

export async function showDetailsAndOpen(
  tasks: TaskSummary[],
  fetchTask?: (id: string) => Promise<Task>
): Promise<void> {
  if (tasks.length === 0) return

  const separator = chalk.dim('\u2500'.repeat(60))

  for (let i = 0; i < tasks.length; i++) {
    if (i > 0) {
      console.log('')
      console.log(separator)
    }
    console.log('')

    if (fetchTask) {
      const full = await fetchTask(tasks[i].id)
      console.log(formatTaskDetail(full))
    } else {
      const fallback: Task = {
        id: tasks[i].id,
        name: tasks[i].name,
        status: { status: tasks[i].status, color: '' },
        custom_item_id: tasks[i].task_type === 'initiative' ? 1 : 0,
        assignees: [],
        url: tasks[i].url,
        list: { id: '', name: tasks[i].list },
        parent: tasks[i].parent,
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
    const { execSync } = await import('child_process')
    for (const url of urls) {
      execSync(`open "${url}"`)
    }
  }
}
