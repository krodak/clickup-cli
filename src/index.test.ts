import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('CLI entry point', () => {
  it('shows help with --help', () => {
    const output = execSync('node dist/index.js --help', { cwd: ROOT }).toString()
    expect(output).toContain('tasks')
    expect(output).toContain('initiatives')
    expect(output).toContain('update')
    expect(output).toContain('create')
  })
})
