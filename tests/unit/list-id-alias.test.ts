import { describe, expect, it } from 'vitest'

import { normalizeListIdAlias } from '../../src/index.js'

describe('normalizeListIdAlias', () => {
  it('rewrites a standalone --list-id to --list', () => {
    expect(normalizeListIdAlias(['node', 'cup', 'tasks', '--list-id', '901327405763'])).toEqual([
      'node',
      'cup',
      'tasks',
      '--list',
      '901327405763',
    ])
  })

  it('rewrites --list-id=VALUE to --list=VALUE', () => {
    expect(normalizeListIdAlias(['node', 'cup', 'tasks', '--list-id=901327405763'])).toEqual([
      'node',
      'cup',
      'tasks',
      '--list=901327405763',
    ])
  })

  it('leaves the canonical --list untouched', () => {
    expect(normalizeListIdAlias(['node', 'cup', 'tasks', '--list', '901327405763'])).toEqual([
      'node',
      'cup',
      'tasks',
      '--list',
      '901327405763',
    ])
  })

  it('does not touch unrelated arguments', () => {
    expect(
      normalizeListIdAlias(['node', 'cup', 'create', '--name', 'x', '--parent', 'abc']),
    ).toEqual(['node', 'cup', 'create', '--name', 'x', '--parent', 'abc'])
  })

  it('rewrites every occurrence in the same argv', () => {
    expect(normalizeListIdAlias(['--list-id', 'a', '--list-id=b'])).toEqual([
      '--list',
      'a',
      '--list=b',
    ])
  })

  it('does not rewrite flags that merely start with --list', () => {
    expect(normalizeListIdAlias(['cup', 'tasks', '--list-ids', 'x'])).toEqual([
      'cup',
      'tasks',
      '--list-ids',
      'x',
    ])
  })
})
