import { describe, expect, it } from 'vitest'
import {
  buildSyncGraph,
  createOrder,
  isPathRef,
  relativeRef,
} from '../../../src/task-sync/graph.js'
import type { DiscoveredTaskFile } from '../../../src/task-sync/discover.js'
import { asStringList, parseMarkdownFile } from '../../../src/task-sync/frontmatter.js'

function node(rel: string, fm: DiscoveredTaskFile['frontmatter']): DiscoveredTaskFile {
  return {
    file: `/tmp/sync/${rel}`,
    rel,
    frontmatter: fm,
    body: '# x\n',
  }
}

describe('sync graph', () => {
  it('uses child parent: as the canonical parent', () => {
    const files = [
      node('epic.md', { title: 'Epic', subtasks: ['a.md'] }),
      node('a.md', { title: 'A', parent: 'epic.md' }),
    ]
    const graph = buildSyncGraph('/tmp/sync', files)
    expect(graph.parentOf.get('/tmp/sync/a.md')).toBe('/tmp/sync/epic.md')
    expect(graph.childrenOf.get('/tmp/sync/epic.md')).toEqual(['/tmp/sync/a.md'])
    expect(createOrder(graph).map(n => n.rel)).toEqual(['epic.md', 'a.md'])
  })

  it('fills parent from subtasks: when the child omits parent', () => {
    const files = [
      node('epic.md', { title: 'Epic', subtasks: ['./child.md'] }),
      node('child.md', { title: 'Child' }),
    ]
    const graph = buildSyncGraph('/tmp/sync', files)
    expect(graph.parentOf.get('/tmp/sync/child.md')).toBe('/tmp/sync/epic.md')
  })

  it('keeps the child parent: when it disagrees with another file subtasks:', () => {
    const files = [
      node('epic.md', { title: 'Epic', subtasks: ['a.md'] }),
      node('other.md', { title: 'Other', subtasks: ['a.md'] }),
      node('a.md', { title: 'A', parent: 'epic.md' }),
    ]
    const graph = buildSyncGraph('/tmp/sync', files)
    expect(graph.parentOf.get('/tmp/sync/a.md')).toBe('/tmp/sync/epic.md')
    expect(graph.warnings.some(w => w.includes('also lists it'))).toBe(true)
  })

  it('throws on a parent cycle', () => {
    const files = [
      node('a.md', { title: 'A', parent: 'b.md' }),
      node('b.md', { title: 'B', parent: 'a.md' }),
    ]
    expect(() => buildSyncGraph('/tmp/sync', files)).toThrow(/Cycle/)
  })

  it('resolves clickup ids in subtasks to local files', () => {
    const files = [
      node('epic.md', { title: 'Epic', clickup_id: 'p1', subtasks: ['c1'] }),
      node('kid.md', { title: 'Kid', clickup_id: 'c1' }),
    ]
    const graph = buildSyncGraph('/tmp/sync', files)
    expect(graph.parentOf.get('/tmp/sync/kid.md')).toBe('/tmp/sync/epic.md')
  })

  it('creates parents before nested children', () => {
    const files = [
      node('c.md', { title: 'C', parent: 'b.md' }),
      node('a.md', { title: 'A' }),
      node('b.md', { title: 'B', parent: 'a.md' }),
    ]
    const graph = buildSyncGraph('/tmp/sync', files)
    expect(createOrder(graph).map(n => n.rel)).toEqual(['a.md', 'b.md', 'c.md'])
  })

  it('does not treat a clickup id as a parent file', () => {
    const files = [node('child.md', { title: 'Child', parent: '86abcxyz' })]
    const graph = buildSyncGraph('/tmp/sync', files)
    expect(graph.parentOf.has('/tmp/sync/child.md')).toBe(false)
    expect(graph.warnings.some(w => w.includes("parent '86abcxyz'"))).toBe(true)
  })
})

describe('refs', () => {
  it('classifies paths vs clickup ids', () => {
    expect(isPathRef('./epic.md')).toBe(true)
    expect(isPathRef('epic.md')).toBe(true)
    expect(isPathRef('../x.md')).toBe(true)
    expect(isPathRef('86abcxyz')).toBe(false)
  })

  it('writes a relative path with a leading ./', () => {
    expect(relativeRef('/tmp/sync/a.md', '/tmp/sync/b.md')).toBe('./b.md')
    expect(relativeRef('/tmp/sync/nested/a.md', '/tmp/sync/b.md')).toBe('../b.md')
  })
})

describe('frontmatter lists', () => {
  it('coerces a single string to a list', () => {
    expect(asStringList('a.md')).toEqual(['a.md'])
    expect(asStringList(['a.md', 'b.md'])).toEqual(['a.md', 'b.md'])
    expect(asStringList([1, 'b.md'])).toEqual(['1', 'b.md'])
  })

  it('parses parent/subtasks/depends_on', () => {
    const parsed = parseMarkdownFile(`---
title: Child
parent: ./epic.md
subtasks:
  - a.md
depends_on:
  - setup.md
blocks:
  - later.md
---
# Hi
`)
    expect(parsed.frontmatter.parent).toBe('./epic.md')
    expect(parsed.frontmatter.subtasks).toEqual(['a.md'])
    expect(parsed.frontmatter.depends_on).toEqual(['setup.md'])
    expect(parsed.frontmatter.blocks).toEqual(['later.md'])
  })
})
