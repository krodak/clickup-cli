import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('CLI entry point', () => {
  it('shows help with --help', () => {
    const output = execSync('node dist/index.js --help', { cwd: ROOT }).toString()
    expect(output).toContain('init')
    expect(output).toContain('tasks')
    expect(output).toContain('initiatives')
    expect(output).toContain('task')
    expect(output).toContain('update')
    expect(output).toContain('create')
    expect(output).toContain('sprint')
    expect(output).toContain('sprints')
    expect(output).toContain('subtasks')
    expect(output).toContain('comment')
    expect(output).toContain('comments')
    expect(output).toContain('activity')
    expect(output).toContain('lists')
    expect(output).toContain('spaces')
    expect(output).toContain('inbox')
    expect(output).toContain('assigned')
    expect(output).toContain('open')
    expect(output).toContain('search')
    expect(output).toContain('summary')
    expect(output).toContain('overdue')
    expect(output).toContain('assign')
    expect(output).toContain('config')
    expect(output).toContain('completion')
    expect(output).toContain('auth')
  })
})
