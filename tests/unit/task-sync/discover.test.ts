import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverTaskFiles, isTaskMarkdown, slugTitle } from '../../../src/task-sync/discover.js'

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'cup-discover-'))
}

describe('discoverTaskFiles', () => {
  it('walks nested markdown and skips notes without task frontmatter', async () => {
    const dir = await tmp()
    await mkdir(join(dir, 'nested'), { recursive: true })
    await writeFile(
      join(dir, 'epic.md'),
      `---
title: Epic
subtasks:
  - ./nested/child.md
---
# Epic
`,
    )
    await writeFile(
      join(dir, 'nested', 'child.md'),
      `---
title: Child
parent: ../epic.md
---
# Child
`,
    )
    await writeFile(join(dir, 'README.md'), '# Notes\n\nNot a task.\n')
    const files = await discoverTaskFiles(dir)
    expect(files.map(f => f.rel)).toEqual(['epic.md', 'nested/child.md'])
  })

  it('treats blocks-only files as tasks', () => {
    expect(isTaskMarkdown({ blocks: ['a.md'] })).toBe(true)
    expect(isTaskMarkdown({})).toBe(false)
  })

  it('slugs titles for filenames', () => {
    expect(slugTitle('Implement Sync')).toBe('implement-sync')
    expect(slugTitle('???')).toBe('task')
  })
})
