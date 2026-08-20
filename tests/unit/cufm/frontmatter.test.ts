import { describe, expect, it } from 'vitest'
import { parseMarkdownFile, stringifyMarkdownFile } from '../../../src/task-sync/frontmatter.js'

describe('task-sync frontmatter', () => {
  it('round-trips unknown keys', () => {
    const src = `---
clickup_id: abc
extra: keep-me
---
# Hello
`
    const parsed = parseMarkdownFile(src)
    expect(parsed.frontmatter.clickup_id).toBe('abc')
    expect(parsed.frontmatter.extra).toBe('keep-me')
    expect(parsed.body.trim()).toBe('# Hello')
    const out = stringifyMarkdownFile(parsed.frontmatter, parsed.body)
    expect(out).toContain('clickup_id: abc')
    expect(out).toContain('extra: keep-me')
    expect(out).toContain('# Hello')
  })

  it('treats files without frontmatter as body-only', () => {
    const parsed = parseMarkdownFile('# Hi\n')
    expect(parsed.frontmatter).toEqual({})
    expect(parsed.body).toBe('# Hi\n')
  })
})
