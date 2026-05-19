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

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleAttachments: TaskAttachment[] = [
  {
    id: 'att1',
    title: 'screenshot.png',
    url: 'https://example.com/screenshot.png',
    extension: 'png',
    mime_type: 'image/png',
    size: 2048,
    date_created: 1700000000000,
    user_id: 1,
  },
  {
    id: 'att2',
    title: 'report.pdf',
    url: 'https://example.com/report.pdf',
    extension: 'pdf',
    mime_type: 'application/pdf',
    size: 1572864,
    date_created: 1700100000000,
    user_id: 2,
  },
]

describe('listTaskAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns attachments from API', async () => {
    mockGetTaskAttachments.mockResolvedValue(sampleAttachments)
    const { listTaskAttachments } = await import('../../../src/commands/attachments.js')
    const result = await listTaskAttachments(mockConfig, 'task1')
    expect(result).toEqual(sampleAttachments)
    expect(mockGetTaskAttachments).toHaveBeenCalledWith('task1')
  })
})

describe('formatAttachmentsTable', () => {
  it('returns "No attachments found" for empty array', async () => {
    const { formatAttachmentsTable } = await import('../../../src/commands/attachments.js')
    expect(formatAttachmentsTable([])).toBe('No attachments found')
  })

  it('formats attachments with title, extension, size, and URL', async () => {
    const { formatAttachmentsTable } = await import('../../../src/commands/attachments.js')
    const result = formatAttachmentsTable(sampleAttachments)
    expect(result).toContain('screenshot.png')
    expect(result).toContain('report.pdf')
    expect(result).toContain('png')
    expect(result).toContain('pdf')
  })

  it('formats size in human-readable units', async () => {
    const { formatAttachmentsTable } = await import('../../../src/commands/attachments.js')
    const result = formatAttachmentsTable(sampleAttachments)
    expect(result).toContain('2.0 KB')
    expect(result).toContain('1.5 MB')
  })
})

describe('formatAttachmentsMarkdown', () => {
  it('returns "No attachments found" for empty array', async () => {
    const { formatAttachmentsMarkdown } = await import('../../../src/commands/attachments.js')
    expect(formatAttachmentsMarkdown([])).toBe('No attachments found')
  })

  it('formats attachments as markdown list', async () => {
    const { formatAttachmentsMarkdown } = await import('../../../src/commands/attachments.js')
    const result = formatAttachmentsMarkdown(sampleAttachments)
    expect(result).toContain('screenshot.png')
    expect(result).toContain('report.pdf')
    expect(result).toContain('https://example.com/screenshot.png')
  })
})

describe('formatSize', () => {
  it('formats bytes', async () => {
    const { formatSize } = await import('../../../src/commands/attachments.js')
    expect(formatSize(500)).toBe('500 B')
  })

  it('formats kilobytes', async () => {
    const { formatSize } = await import('../../../src/commands/attachments.js')
    expect(formatSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes', async () => {
    const { formatSize } = await import('../../../src/commands/attachments.js')
    expect(formatSize(1572864)).toBe('1.5 MB')
  })
})
