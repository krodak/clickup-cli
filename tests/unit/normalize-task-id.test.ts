import { describe, expect, it } from 'vitest'
import { normalizeTaskId } from '../../src/api.js'

describe('normalizeTaskId', () => {
  it('extracts native task ID from URL', () => {
    expect(normalizeTaskId('https://app.clickup.com/t/abc123def')).toBe('abc123def')
  })
  it('extracts custom task ID from URL with workspace segment', () => {
    expect(normalizeTaskId('https://app.clickup.com/t/9017679539/DEV-2760')).toBe('DEV-2760')
  })
  it('strips query string', () => {
    expect(normalizeTaskId('https://app.clickup.com/t/abc123def?tab=comments')).toBe('abc123def')
  })
  it('strips fragment', () => {
    expect(normalizeTaskId('https://app.clickup.com/t/abc123?x=1#section')).toBe('abc123')
  })
  it('handles http (not https)', () => {
    expect(normalizeTaskId('http://app.clickup.com/t/abc123')).toBe('abc123')
  })
  it('passes through bare native ID', () => {
    expect(normalizeTaskId('abc123def')).toBe('abc123def')
  })
  it('passes through bare custom ID', () => {
    expect(normalizeTaskId('DEV-2760')).toBe('DEV-2760')
  })
  it('passes through non-clickup URLs unchanged', () => {
    expect(normalizeTaskId('https://example.com/t/foo')).toBe('https://example.com/t/foo')
  })
  it('trims whitespace', () => {
    expect(normalizeTaskId('  https://app.clickup.com/t/abc123  ')).toBe('abc123')
  })
})
