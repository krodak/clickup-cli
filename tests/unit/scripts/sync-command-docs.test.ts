import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('version synchronization', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }

  it('package.json version matches .claude-plugin/plugin.json', () => {
    const plugin = JSON.parse(readFileSync(resolve('.claude-plugin/plugin.json'), 'utf8')) as {
      version: string
    }
    expect(plugin.version).toBe(pkg.version)
  })

  it('package.json version matches SKILL.md header', () => {
    const skill = readFileSync(resolve('skills/clickup-cli/SKILL.md'), 'utf8')
    const match = /# ClickUp CLI \(`cup`\) - skill version (.+)/.exec(skill)
    expect(match).not.toBeNull()
    expect(match![1]).toBe(pkg.version)
  })

  it('package.json version matches SKILL.md version check hint', () => {
    const skill = readFileSync(resolve('skills/clickup-cli/SKILL.md'), 'utf8')
    const match = /older than (\S+), update with/.exec(skill)
    expect(match).not.toBeNull()
    expect(match![1]).toBe(pkg.version)
  })
})
