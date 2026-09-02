import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { safeAttachmentFilename, writeTaskBundle } from '../../../src/export/writer.js'
import type { TaskBundle } from '../../../src/export/bundle.js'

function bundle(): TaskBundle {
  return {
    task: {
      id: 't1',
      name: 'Parent',
      status: { status: 'open', color: '#000' },
      assignees: [],
      url: 'https://app.clickup.com/t/t1',
      list: { id: 'l1', name: 'L' },
      markdown_description: 'Body',
      attachments: [
        {
          id: 'a1',
          version: '1',
          date: 1,
          title: 'shot.png',
          extension: 'png',
          url: 'https://cdn/a1',
        },
        {
          id: 'a2',
          version: '1',
          date: 1,
          title: '../evil name?.pdf',
          extension: 'pdf',
          url: 'https://cdn/a2',
        },
      ],
    },
    comments: [
      { id: 'c1', comment_text: 'hi', user: { username: 'u' }, date: '1700000000000', replies: [] },
    ],
    attachments: [],
    subtaskIds: [],
    fetchedAt: '2026-08-30T10:00:00.000Z',
  }
}

describe('safeAttachmentFilename', () => {
  it('prefixes with the attachment id and strips path separators and unsafe chars', () => {
    expect(safeAttachmentFilename('a2', '../evil name?.pdf')).toBe('a2-evil-name.pdf')
    expect(safeAttachmentFilename('a1', 'shot.png')).toBe('a1-shot.png')
  })
})

describe('writeTaskBundle', () => {
  let root: string
  const downloader = vi.fn()

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cup-writer-'))
    downloader.mockReset().mockImplementation(async (url: string) => Buffer.from(`file:${url}`))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('writes task.json, task.md, comments.json, comments.md and attachments', async () => {
    const b = bundle()
    b.attachments = b.task.attachments!
    const result = await writeTaskBundle(root, b, {
      hasTask: () => false,
      downloadAttachments: true,
      download: downloader,
    })

    const dir = join(root, 'tasks', 't1')
    expect(existsSync(join(dir, 'task.json'))).toBe(true)
    expect(existsSync(join(dir, 'task.md'))).toBe(true)
    expect(existsSync(join(dir, 'comments.json'))).toBe(true)
    expect(existsSync(join(dir, 'comments.md'))).toBe(true)
    expect(existsSync(join(dir, 'attachments', 'a1-shot.png'))).toBe(true)
    expect(existsSync(join(dir, 'attachments', 'a2-evil-name.pdf'))).toBe(true)
    expect(readFileSync(join(dir, 'attachments', 'a1-shot.png'), 'utf8')).toBe(
      'file:https://cdn/a1',
    )

    const taskJson = JSON.parse(readFileSync(join(dir, 'task.json'), 'utf8'))
    expect(taskJson.id).toBe('t1')
    const commentsJson = JSON.parse(readFileSync(join(dir, 'comments.json'), 'utf8'))
    expect(commentsJson[0].id).toBe('c1')

    const md = readFileSync(join(dir, 'task.md'), 'utf8')
    expect(md).toContain('- [shot.png](attachments/a1-shot.png)')
    expect(result.attachmentsDownloaded).toBe(2)
    expect(result.attachmentsFailed).toEqual([])
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('skips binaries but still writes attachments.json when downloads are off', async () => {
    const b = bundle()
    b.attachments = b.task.attachments!
    await writeTaskBundle(root, b, {
      hasTask: () => false,
      downloadAttachments: false,
      download: downloader,
    })
    const dir = join(root, 'tasks', 't1')
    expect(downloader).not.toHaveBeenCalled()
    expect(existsSync(join(dir, 'attachments', 'a1-shot.png'))).toBe(false)
    expect(existsSync(join(dir, 'attachments.json'))).toBe(true)
    expect(readFileSync(join(dir, 'task.md'), 'utf8')).toContain('(not downloaded)')
  })

  it('records a failed download and keeps the CDN link instead of aborting', async () => {
    const b = bundle()
    b.attachments = b.task.attachments!
    downloader.mockImplementation(async (url: string) => {
      if (url.endsWith('a2')) throw new Error('HTTP 403')
      return Buffer.from('ok')
    })
    const result = await writeTaskBundle(root, b, {
      hasTask: () => false,
      downloadAttachments: true,
      download: downloader,
    })
    expect(result.attachmentsDownloaded).toBe(1)
    expect(result.attachmentsFailed).toEqual([
      { id: 'a2', title: '../evil name?.pdf', error: 'HTTP 403' },
    ])
    const md = readFileSync(join(root, 'tasks', 't1', 'task.md'), 'utf8')
    expect(md).toContain('[shot.png](attachments/a1-shot.png)')
    expect(md).toContain('(https://cdn/a2) (not downloaded)')
  })

  it('does not re-download an attachment that already exists on disk', async () => {
    const b = bundle()
    b.attachments = [b.task.attachments![0]!]
    b.task.attachments = b.attachments
    const opts = { hasTask: () => false, downloadAttachments: true, download: downloader }
    await writeTaskBundle(root, b, opts)
    await writeTaskBundle(root, b, opts)
    expect(downloader).toHaveBeenCalledTimes(1)
  })
})
