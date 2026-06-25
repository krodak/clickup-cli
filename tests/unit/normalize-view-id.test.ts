import { describe, expect, it } from 'vitest'
import { normalizeViewId } from '../../src/api.js'

describe('normalizeViewId', () => {
  it('extracts view ID from full URL', () => {
    expect(normalizeViewId('https://app.clickup.com/9017679539/v/gr/a0z2g-712814')).toBe(
      'a0z2g-712814',
    )
  })
  it('handles list view type', () => {
    expect(normalizeViewId('https://app.clickup.com/9017679539/v/li/a0z2g-100')).toBe('a0z2g-100')
  })
  it('handles board view type', () => {
    expect(normalizeViewId('https://app.clickup.com/9017679539/v/b/a0z2g-200')).toBe('a0z2g-200')
  })
  it('handles calendar view type', () => {
    expect(normalizeViewId('https://app.clickup.com/9017679539/v/cal/a0z2g-300')).toBe('a0z2g-300')
  })
  it('strips query string', () => {
    expect(normalizeViewId('https://app.clickup.com/9017679539/v/gr/a0z2g-712814?x=1')).toBe(
      'a0z2g-712814',
    )
  })
  it('strips fragment', () => {
    expect(normalizeViewId('https://app.clickup.com/9017679539/v/gr/a0z2g-712814#section')).toBe(
      'a0z2g-712814',
    )
  })
  it('handles http (not https)', () => {
    expect(normalizeViewId('http://app.clickup.com/9017679539/v/gr/a0z2g-712814')).toBe(
      'a0z2g-712814',
    )
  })
  it('passes through bare view IDs unchanged', () => {
    expect(normalizeViewId('a0z2g-712814')).toBe('a0z2g-712814')
  })
  it('passes through non-clickup URLs unchanged', () => {
    expect(normalizeViewId('https://example.com/v/gr/foo')).toBe('https://example.com/v/gr/foo')
  })
  it('trims whitespace', () => {
    expect(normalizeViewId('  https://app.clickup.com/9017679539/v/gr/a0z2g-712814  ')).toBe(
      'a0z2g-712814',
    )
  })
})
