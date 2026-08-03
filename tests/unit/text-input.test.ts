import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadFileSync = vi.fn()
const mockReadSync = vi.fn()

vi.mock('node:fs', () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  readSync: (...args: unknown[]) => mockReadSync(...args),
}))

/** Queue up stdin chunks, then EOF (bytesRead === 0). */
function stdinYields(...chunks: string[]): void {
  let i = 0
  mockReadSync.mockImplementation((_fd: number, buf: Buffer) => {
    if (i >= chunks.length) return 0
    const data = Buffer.from(chunks[i]!, 'utf8')
    i++
    data.copy(buf)
    return data.length
  })
}

function eagainError(): NodeJS.ErrnoException {
  const err = new Error('EAGAIN: resource temporarily unavailable, read') as NodeJS.ErrnoException
  err.code = 'EAGAIN'
  return err
}

describe('resolveTextInput', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockReadSync.mockReset()
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
    stdinYields('from stdin\n')
    const { resolveTextInput } = await import('../../src/text-input.js')
    const result = resolveTextInput({
      file: '-',
      inlineFlag: '-m',
      fileFlag: '--message-file',
    })
    expect(result).toBe('from stdin')
  })

  it('concatenates multiple stdin chunks', async () => {
    stdinYields('first line\n', 'second line\n')
    const { resolveTextInput } = await import('../../src/text-input.js')
    const result = resolveTextInput({
      file: '-',
      inlineFlag: '-m',
      fileFlag: '--message-file',
    })
    expect(result).toBe('first line\nsecond line')
  })

  it('retries on EAGAIN instead of failing (non-blocking pipe race)', async () => {
    let call = 0
    mockReadSync.mockImplementation((_fd: number, buf: Buffer) => {
      call++
      if (call <= 3) throw eagainError()
      if (call === 4) {
        const data = Buffer.from('arrived late\n', 'utf8')
        data.copy(buf)
        return data.length
      }
      return 0
    })
    const { resolveTextInput } = await import('../../src/text-input.js')
    const result = resolveTextInput({
      file: '-',
      inlineFlag: '--set <value>',
      fileFlag: '--value-file',
    })
    expect(result).toBe('arrived late')
    expect(call).toBeGreaterThan(3)
  })

  it('treats EOF as end of stream', async () => {
    let call = 0
    mockReadSync.mockImplementation((_fd: number, buf: Buffer) => {
      call++
      if (call === 1) {
        const data = Buffer.from('partial', 'utf8')
        data.copy(buf)
        return data.length
      }
      const err = new Error('EOF') as NodeJS.ErrnoException
      err.code = 'EOF'
      throw err
    })
    const { resolveTextInput } = await import('../../src/text-input.js')
    expect(resolveTextInput({ file: '-', inlineFlag: '-m', fileFlag: '--message-file' })).toBe(
      'partial',
    )
  })

  it('wraps a non-EAGAIN stdin error with the flag name', async () => {
    mockReadSync.mockImplementation(() => {
      const err = new Error('EIO: i/o error, read') as NodeJS.ErrnoException
      err.code = 'EIO'
      throw err
    })
    const { resolveTextInput } = await import('../../src/text-input.js')
    expect(() =>
      resolveTextInput({ file: '-', inlineFlag: '-m', fileFlag: '--message-file' }),
    ).toThrow('Failed to read --message-file from stdin: EIO')
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
