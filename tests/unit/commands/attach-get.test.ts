import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskAttachment } from '../../../src/api.js'

const mockGetTaskAttachments = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getTaskAttachments: mockGetTaskAttachments,
    }
  }),
}))

const mockAccess = vi.fn()
const mockWriteFile = vi.fn()

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => mockAccess(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleAttachments: TaskAttachment[] = [
  {
    id: 'att1',
    title: 'screenshot.png',
    url: 'https://files.clickup-attachments.com/screenshot.png',
    extension: 'png',
    mime_type: 'image/png',
    size: 2048,
    date_created: 1700000000000,
    user_id: 1,
  },
  {
    id: 'att2',
    title: 'report.pdf',
    url: 'https://files.clickup-attachments.com/report.pdf',
    extension: 'pdf',
    mime_type: 'application/pdf',
    size: 1572864,
    date_created: 1700100000000,
    user_id: 2,
  },
]

function okFetch(bytes = 10): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes)),
  })
}

describe('sanitizeFilename', () => {
  it('strips forward and back slashes', async () => {
    const { sanitizeFilename } = await import('../../../src/commands/attach-get.js')
    expect(sanitizeFilename('a/b\\c.png')).toBe('a_b_c.png')
  })

  it('strips leading dots', async () => {
    const { sanitizeFilename } = await import('../../../src/commands/attach-get.js')
    expect(sanitizeFilename('...hidden.txt')).toBe('hidden.txt')
  })

  it('returns "attachment" for empty result', async () => {
    const { sanitizeFilename } = await import('../../../src/commands/attach-get.js')
    expect(sanitizeFilename('...')).toBe('attachment')
  })
})

describe('selectAttachments', () => {
  it('returns the single attachment when no selector given', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    const result = selectAttachments([sampleAttachments[0]!], undefined, false)
    expect(result).toEqual([sampleAttachments[0]])
  })

  it('errors when multiple and no selector', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    expect(() => selectAttachments(sampleAttachments, undefined, false)).toThrow(/2 attachments/)
  })

  it('selects by exact ID', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    const result = selectAttachments(sampleAttachments, 'att2', false)
    expect(result).toEqual([sampleAttachments[1]])
  })

  it('selects by exact title case-insensitively', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    const result = selectAttachments(sampleAttachments, 'REPORT.PDF', false)
    expect(result).toEqual([sampleAttachments[1]])
  })

  it('selects by partial title with one match', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    const result = selectAttachments(sampleAttachments, 'screen', false)
    expect(result).toEqual([sampleAttachments[0]])
  })

  it('errors when partial title matches multiple', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    const attachments: TaskAttachment[] = [
      { ...sampleAttachments[0]!, title: 'report-a.png' },
      { ...sampleAttachments[1]!, title: 'report-b.pdf' },
    ]
    expect(() => selectAttachments(attachments, 'report', false)).toThrow(/Multiple/)
  })

  it('errors when no match', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    expect(() => selectAttachments(sampleAttachments, 'nope', false)).toThrow(
      /No attachment matching/,
    )
  })

  it('returns all when all flag set', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    expect(selectAttachments(sampleAttachments, undefined, true)).toEqual(sampleAttachments)
  })

  it('errors when empty and not all', async () => {
    const { selectAttachments } = await import('../../../src/commands/attach-get.js')
    expect(() => selectAttachments([], undefined, false)).toThrow(/No attachments found/)
  })
})

describe('downloadAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes the downloaded buffer to disk', async () => {
    mockAccess.mockRejectedValue(new Error('ENOENT'))
    vi.stubGlobal('fetch', okFetch(10))
    const { downloadAttachment } = await import('../../../src/commands/attach-get.js')
    const result = await downloadAttachment(sampleAttachments[0]!, '/tmp/out.png', false)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(mockWriteFile.mock.calls[0]![0]).toBe('/tmp/out.png')
    expect(result).toEqual({ title: 'screenshot.png', path: '/tmp/out.png', size: 10 })
    vi.unstubAllGlobals()
  })

  it('throws when file exists and not forced', async () => {
    mockAccess.mockResolvedValue(undefined)
    vi.stubGlobal('fetch', okFetch(10))
    const { downloadAttachment } = await import('../../../src/commands/attach-get.js')
    await expect(downloadAttachment(sampleAttachments[0]!, '/tmp/out.png', false)).rejects.toThrow(
      /already exists/,
    )
    expect(mockWriteFile).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('overwrites when forced', async () => {
    mockAccess.mockResolvedValue(undefined)
    vi.stubGlobal('fetch', okFetch(20))
    const { downloadAttachment } = await import('../../../src/commands/attach-get.js')
    const result = await downloadAttachment(sampleAttachments[0]!, '/tmp/out.png', true)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(result.size).toBe(20)
    vi.unstubAllGlobals()
  })

  it('throws on HTTP error', async () => {
    mockAccess.mockRejectedValue(new Error('ENOENT'))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      }),
    )
    const { downloadAttachment } = await import('../../../src/commands/attach-get.js')
    await expect(downloadAttachment(sampleAttachments[0]!, '/tmp/out.png', false)).rejects.toThrow(
      /HTTP 404/,
    )
    expect(mockWriteFile).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('attachGet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('downloads a single attachment by selector', async () => {
    mockGetTaskAttachments.mockResolvedValue(sampleAttachments)
    mockAccess.mockRejectedValue(new Error('ENOENT'))
    vi.stubGlobal('fetch', okFetch(10))
    const { attachGet } = await import('../../../src/commands/attach-get.js')
    const results = await attachGet(mockConfig, 'task1', 'report.pdf', {})
    expect(results).toHaveLength(1)
    expect(results[0]!.title).toBe('report.pdf')
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('downloads all attachments with all flag', async () => {
    mockGetTaskAttachments.mockResolvedValue(sampleAttachments)
    mockAccess.mockRejectedValue(new Error('ENOENT'))
    vi.stubGlobal('fetch', okFetch(10))
    const { attachGet } = await import('../../../src/commands/attach-get.js')
    const results = await attachGet(mockConfig, 'task1', undefined, { all: true })
    expect(results).toHaveLength(2)
    expect(mockWriteFile).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })
})
