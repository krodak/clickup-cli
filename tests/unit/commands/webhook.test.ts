import { describe, it, expect, vi, beforeEach } from 'vitest'

const sampleWebhooks = [
  {
    id: 'wh_1',
    userid: 100,
    team_id: 1,
    endpoint: 'https://example.com/hook1',
    events: ['taskCreated', 'taskUpdated'],
    status: 'active',
  },
  {
    id: 'wh_2',
    userid: 100,
    team_id: 1,
    endpoint: 'https://example.com/hook2',
    events: ['taskDeleted'],
    status: 'inactive',
    space_id: 'sp_1',
  },
]

const mockGetWebhooks = vi.fn().mockResolvedValue(sampleWebhooks)
const mockCreateWebhook = vi.fn().mockResolvedValue({
  id: 'wh_new',
  userid: 100,
  team_id: 1,
  endpoint: 'https://example.com/new',
  events: ['taskCreated'],
  status: 'active',
})
const mockUpdateWebhook = vi.fn().mockResolvedValue({
  id: 'wh_1',
  userid: 100,
  team_id: 1,
  endpoint: 'https://example.com/updated',
  events: ['taskCreated'],
  status: 'active',
})
const mockDeleteWebhook = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getWebhooks: mockGetWebhooks,
      createWebhook: mockCreateWebhook,
      updateWebhook: mockUpdateWebhook,
      deleteWebhook: mockDeleteWebhook,
    }
  }),
}))

vi.mock('../../../src/output.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../../src/output.js')>('../../../src/output.js')
  return {
    ...actual,
    isTTY: vi.fn().mockReturnValue(false),
  }
})

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(false),
}))

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

describe('fetchWebhooks', () => {
  beforeEach(() => {
    mockGetWebhooks.mockClear()
  })

  it('returns webhooks from API', async () => {
    const { fetchWebhooks } = await import('../../../src/commands/webhook.js')
    const result = await fetchWebhooks(config)
    expect(result).toEqual(sampleWebhooks)
    expect(mockGetWebhooks).toHaveBeenCalledOnce()
  })
})

describe('createWebhookCommand', () => {
  beforeEach(() => {
    mockCreateWebhook.mockClear()
  })

  it('creates a webhook with URL and events', async () => {
    const { createWebhookCommand } = await import('../../../src/commands/webhook.js')
    const result = await createWebhookCommand(config, {
      url: 'https://example.com/new',
      events: 'taskCreated',
    })
    expect(mockCreateWebhook).toHaveBeenCalledWith('https://example.com/new', ['taskCreated'], {})
    expect(result.id).toBe('wh_new')
  })

  it('passes scope options through', async () => {
    const { createWebhookCommand } = await import('../../../src/commands/webhook.js')
    await createWebhookCommand(config, {
      url: 'https://example.com/new',
      events: 'taskCreated,taskUpdated',
      space: 'sp_1',
    })
    expect(mockCreateWebhook).toHaveBeenCalledWith(
      'https://example.com/new',
      ['taskCreated', 'taskUpdated'],
      { spaceId: 'sp_1' },
    )
  })
})

describe('updateWebhookCommand', () => {
  beforeEach(() => {
    mockUpdateWebhook.mockClear()
  })

  it('updates a webhook', async () => {
    const { updateWebhookCommand } = await import('../../../src/commands/webhook.js')
    const result = await updateWebhookCommand(config, 'wh_1', {
      url: 'https://example.com/updated',
    })
    expect(mockUpdateWebhook).toHaveBeenCalledWith('wh_1', {
      endpoint: 'https://example.com/updated',
    })
    expect(result.id).toBe('wh_1')
  })

  it('passes events and status', async () => {
    const { updateWebhookCommand } = await import('../../../src/commands/webhook.js')
    await updateWebhookCommand(config, 'wh_1', {
      events: 'taskCreated',
      status: 'inactive',
    })
    expect(mockUpdateWebhook).toHaveBeenCalledWith('wh_1', {
      events: ['taskCreated'],
      status: 'inactive',
    })
  })
})

describe('deleteWebhookCommand', () => {
  beforeEach(async () => {
    mockDeleteWebhook.mockClear()
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockReset().mockResolvedValue(false)
  })

  it('deletes a webhook with --confirm', async () => {
    const { deleteWebhookCommand } = await import('../../../src/commands/webhook.js')
    const result = await deleteWebhookCommand(config, 'wh_1', { confirm: true })
    expect(mockDeleteWebhook).toHaveBeenCalledWith('wh_1')
    expect(result).toEqual({ webhookId: 'wh_1', deleted: true })
  })

  it('throws when non-TTY and --confirm not provided', async () => {
    const { deleteWebhookCommand } = await import('../../../src/commands/webhook.js')
    await expect(deleteWebhookCommand(config, 'wh_1', {})).rejects.toThrow(
      'requires --confirm flag in non-interactive mode',
    )
    expect(mockDeleteWebhook).not.toHaveBeenCalled()
  })

  it('throws Cancelled when user declines', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)
    const { deleteWebhookCommand } = await import('../../../src/commands/webhook.js')
    await expect(deleteWebhookCommand(config, 'wh_1', {})).rejects.toThrow('Cancelled')
    expect(mockDeleteWebhook).not.toHaveBeenCalled()
  })
})

describe('formatWebhooks', () => {
  it('formats webhooks for TTY', async () => {
    const { formatWebhooks } = await import('../../../src/commands/webhook.js')
    const output = formatWebhooks(sampleWebhooks)
    expect(output).toContain('wh_1')
    expect(output).toContain('https://example.com/hook1')
    expect(output).toContain('active')
  })

  it('handles empty list', async () => {
    const { formatWebhooks } = await import('../../../src/commands/webhook.js')
    const output = formatWebhooks([])
    expect(output).toContain('No webhooks')
  })
})

describe('formatWebhooksMarkdown', () => {
  it('formats webhooks as markdown', async () => {
    const { formatWebhooksMarkdown } = await import('../../../src/commands/webhook.js')
    const output = formatWebhooksMarkdown(sampleWebhooks)
    expect(output).toContain('wh_1')
    expect(output).toContain('https://example.com/hook1')
    expect(output).toContain('taskCreated')
  })

  it('handles empty list in markdown', async () => {
    const { formatWebhooksMarkdown } = await import('../../../src/commands/webhook.js')
    const output = formatWebhooksMarkdown([])
    expect(output).toContain('No webhooks')
  })
})
