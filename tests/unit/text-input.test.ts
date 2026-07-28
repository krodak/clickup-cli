import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadFileSync = vi.fn()

vi.mock('node:fs', () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}))

describe('resolveTextInput', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
  })

  it('returns the inline value when only inline is provided', async () => {
    const { resolveTextInput } = await import('../../src/text-input.js')
    expect(
      resolveTextInput({ inline: 'hello', inlineFlag: '-d', fileFlag: '--description-file' }),
    ).toBe('hello')
  })

  it('returns undefined when neither is provided', async () => {
    const { resolveTextInput } = await import('../../src/text-input.js')
    expect(resolveTextInput({ inlineFlag: '-d', fileFlag: '--description-file' })).toBeUndefined()
  })

  it('throws when both inline and file are provided', async () => {
    const { resolveTextInput } = await import('../../src/text-input.js')
    expect(() =>
      resolveTextInput({
        inline: 'x',
        file: 'x.md',
        inlineFlag: '-d',
        fileFlag: '--description-file',
      }),
    ).toThrow('Cannot use -d and --description-file together')
  })

  it('reads file contents and strips a single trailing newline', async () => {
    mockReadFileSync.mockReturnValue('## Title\n\n- a\n- b\n')
    const { resolveTextInput } = await import('../../src/text-input.js')
    const result = resolveTextInput({
      file: '/tmp/desc.md',
      inlineFlag: '-d',
      fileFlag: '--description-file',
    })
    expect(result).toBe('## Title\n\n- a\n- b')
    expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/desc.md', 'utf8')
  })

  it('preserves internal newlines and backticks from the file', async () => {
    mockReadFileSync.mockReturnValue('Use `init()`\n\n## Next')
    const { resolveTextInput } = await import('../../src/text-input.js')
    const result = resolveTextInput({
      file: '/tmp/desc.md',
      inlineFlag: '-d',
      fileFlag: '--description-file',
    })
    expect(result).toBe('Use `init()`\n\n## Next')
  })

  it('reads from stdin when file is "-"', async () => {
    mockReadFileSync.mockReturnValue('from stdin\n')
    const { resolveTextInput } = await import('../../src/text-input.js')
    const result = resolveTextInput({
      file: '-',
      inlineFlag: '-m',
      fileFlag: '--message-file',
    })
    expect(result).toBe('from stdin')
    expect(mockReadFileSync).toHaveBeenCalledWith(0, 'utf8')
  })

  it('wraps a missing-file error with the flag name and path', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    const { resolveTextInput } = await import('../../src/text-input.js')
    expect(() =>
      resolveTextInput({
        file: '/tmp/missing.md',
        inlineFlag: '-d',
        fileFlag: '--description-file',
      }),
    ).toThrow('Cannot read --description-file "/tmp/missing.md": ENOENT')
  })
})
