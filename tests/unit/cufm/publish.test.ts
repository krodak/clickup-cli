import { describe, expect, it } from 'vitest'
import { descriptionNeedsAssets } from '../../../src/cufm/publish.js'

describe('descriptionNeedsAssets', () => {
  it.each([
    '```tldraw\n{"records":[]}\n```',
    '::tldraw{width="640"}\n{"records":[]}\n::',
    '```mermaid\nflowchart LR\n  A --> B\n```',
  ])('detects diagram blocks that need rendering', source => {
    expect(descriptionNeedsAssets(source)).toBe(true)
  })
})
