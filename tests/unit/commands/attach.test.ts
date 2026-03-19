import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateTaskAttachment = vi.fn().mockResolvedValue({
  id: 'att-1',
  version: '0',
  date: 1234567890,
  title: 'test.png',
  extension: 'png',
  url: 'https://example.com/test.png',
})

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    createTaskAttachment: mockCreateTaskAttachment,
  })),
}))

vi.mock('node:fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined),
}))

describe('attach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads a file to a task', async () => {
    const { attachFile } = await import('../../../src/commands/attach.js')
    const result = await attachFile({ apiToken: 'pk_t', teamId: 'team1' }, 't1', '/tmp/test.png')
    expect(mockCreateTaskAttachment).toHaveBeenCalledWith('t1', '/tmp/test.png')
    expect(result.title).toBe('test.png')
  })

  it('throws when file does not exist', async () => {
    const { access } = await import('node:fs/promises')
    vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
    const { attachFile } = await import('../../../src/commands/attach.js')
    await expect(
      attachFile({ apiToken: 'pk_t', teamId: 'team1' }, 't1', '/nonexistent'),
    ).rejects.toThrow('File not found: /nonexistent')
  })
})
