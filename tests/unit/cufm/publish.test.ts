import { describe, expect, it, vi } from 'vitest'
import { descriptionNeedsAssets, writeDescriptionWithFallback } from '../../../src/cufm/publish.js'

describe('descriptionNeedsAssets', () => {
  it.each([
    '```tldraw\n{"records":[]}\n```',
    '::tldraw{width="640"}\n{"records":[]}\n::',
    '```mermaid\nflowchart LR\n  A --> B\n```',
  ])('detects diagram blocks that need rendering', source => {
    expect(descriptionNeedsAssets(source)).toBe(true)
  })
})

describe('writeDescriptionWithFallback', () => {
  it('sends ops when the write succeeds', async () => {
    const write = vi.fn().mockResolvedValue('ok')
    const ops = [{ insert: 'Hi' }, { insert: '\n' }]
    await expect(writeDescriptionWithFallback(write, 'Hi\n', ops)).resolves.toBe('ok')
    expect(write).toHaveBeenCalledOnce()
    expect(write).toHaveBeenCalledWith({ description: { ops } })
  })

  it('retries with markdown_content after a 400', async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error('ClickUp API error 400: Invalid input'))
      .mockResolvedValueOnce('ok')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(writeDescriptionWithFallback(write, '# Hi\n', [{ insert: 'Hi' }])).resolves.toBe(
      'ok',
    )
    spy.mockRestore()
    expect(write).toHaveBeenNthCalledWith(2, { markdown_content: '# Hi\n' })
  })
})
