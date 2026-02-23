import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

// Smoke test: CLI built binary shows all commands in --help
describe('CLI entry point', () => {
  it('shows help with --help', () => {
    // Build first
    execSync('npm run build', { cwd: process.cwd() })
    const output = execSync('node dist/index.js --help').toString()
    expect(output).toContain('tasks')
    expect(output).toContain('initiatives')
    expect(output).toContain('update')
    expect(output).toContain('create')
  })
})
