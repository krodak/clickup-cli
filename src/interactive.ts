import { checkbox, confirm } from '@inquirer/prompts'
import chalk from 'chalk'
import type { TaskSummary } from './commands/tasks.js'

export function formatTaskDetail(task: TaskSummary): string {
  const lines = [
    `${chalk.bold('ID:')}       ${task.id}`,
    `${chalk.bold('Name:')}     ${task.name}`,
    `${chalk.bold('Status:')}   ${task.status}`,
    `${chalk.bold('Type:')}     ${task.task_type}`,
    `${chalk.bold('List:')}     ${task.list}`,
    `${chalk.bold('URL:')}      ${task.url}`,
  ]
  if (task.parent) {
    lines.push(`${chalk.bold('Parent:')}   ${task.parent}`)
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

export async function showDetailsAndOpen(tasks: TaskSummary[]): Promise<void> {
  if (tasks.length === 0) return

  for (const task of tasks) {
    console.log('')
    console.log(formatTaskDetail(task))
  }

  const urls = tasks.map(t => t.url)
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
