import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearFrontdoorHostCache,
  fetchTaskOps,
  updateSyncBlockContents,
} from '../../../src/task-sync/frontdoor.js'

const config = { apiToken: 'pk_test', teamId: '2304761' }

function expiredJwt(): string {
  const part = (o: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(o)).toString('base64url').replace(/=+$/, '')
  return `${part({ alg: 'HS256' })}.${part({ exp: Math.floor(Date.now() / 1000) - 60 })}.sig`
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function handshakeBody(opts?: { base?: string; shardId?: string }): unknown {
  return {
    workspaceId: '2304761',
    shardId: opts?.shardId ?? 'prod-eu-west-1-3',
    appEnvironment: {
      apiUrlBase: opts?.base ?? 'https://frontdoor-prod-eu-west-1-3.clickup.com',
    },
  }
}

function stubFrontdoorFetch(taskBody: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) => {
    if (String(url).includes('/shard/v1/handshake/')) return jsonResponse(handshakeBody())
    return jsonResponse(taskBody)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.CU_SESSION_TOKEN
  delete process.env.CU_FRONTDOOR_HOST
  clearFrontdoorHostCache()
})

describe('Synced Content frontdoor integration', () => {
  it('pulls task ops and backing synced block content from the handshake host', async () => {
    const fetchMock = stubFrontdoorFetch({
      task: { content: JSON.stringify({ ops: [{ insert: { 'sync-block': { id: 's1' } } }] }) },
      sync_blocks: [
        {
          id: 's1',
          content: JSON.stringify({ ops: [{ insert: 'Shared' }, { insert: '\n' }] }),
        },
      ],
    })

    await expect(fetchTaskOps(config, 'task-1', 'jwt')).resolves.toEqual({
      ops: [{ insert: { 'sync-block': { id: 's1' } } }],
      syncBlocks: [{ id: 's1', ops: [{ insert: 'Shared' }, { insert: '\n' }] }],
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://id.app.clickup.com/shard/v1/handshake/2304761',
    )
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      'https://frontdoor-prod-eu-west-1-3.clickup.com/task-v3/',
    )
    expect(fetchMock.mock.calls[1]?.[0]).toContain('fields%5B%5D=sync_blocks')
  })

  it('updates backing synced block content on the handshake host', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes('/shard/v1/handshake/')) return jsonResponse(handshakeBody())
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await updateSyncBlockContents(
      config,
      [{ id: 's1', ops: [{ insert: 'Updated' }, { insert: '\n' }] }],
      'jwt',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://frontdoor-prod-eu-west-1-3.clickup.com/docs-service-v3/core/workspaces/2304761/syncBlocks/s1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          content: JSON.stringify({ ops: [{ insert: 'Updated' }, { insert: '\n' }] }),
        }),
      }),
    )
  })

  it('honors CU_FRONTDOOR_HOST and skips handshake', async () => {
    process.env.CU_FRONTDOOR_HOST = 'frontdoor-override.clickup.com'
    const fetchMock = stubFrontdoorFetch({
      task: { content: JSON.stringify({ ops: [] }) },
    })

    await fetchTaskOps(config, 'task-1', 'jwt')
    expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual([
      expect.stringContaining('https://frontdoor-override.clickup.com/task-v3/'),
    ])
  })

  it('builds the host from shardId when apiUrlBase is missing', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes('/shard/v1/handshake/')) {
        return jsonResponse({ workspaceId: '2304761', shardId: 'prod-ap-southeast-1-1' })
      }
      return jsonResponse({ task: { content: JSON.stringify({ ops: [] }) } })
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchTaskOps(config, 'task-1', 'jwt')
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      'https://frontdoor-prod-ap-southeast-1-1.clickup.com/task-v3/',
    )
  })

  it('ignores a handshake host that is not on clickup.com', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes('/shard/v1/handshake/')) {
        return jsonResponse(handshakeBody({ base: 'https://evil.example/v1' }))
      }
      return jsonResponse({ task: { content: JSON.stringify({ ops: [] }) } })
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchTaskOps(config, 'task-1', 'jwt')
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      'https://frontdoor-prod-eu-west-1-3.clickup.com/task-v3/',
    )
  })

  it('falls back to markdown when handshake fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ err: 'Invalid Workspace ID' }, 400))
    vi.stubGlobal('fetch', fetchMock)
    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation(msg => errors.push(String(msg)))

    await expect(fetchTaskOps(config, 'task-1', 'jwt')).resolves.toBeUndefined()
    expect(errors.join('\n')).toMatch(/handshake failed/)
    spy.mockRestore()
  })

  it('uses the stored session token when no flag or env var is set', async () => {
    const fetchMock = stubFrontdoorFetch({ task: { content: JSON.stringify({ ops: [] }) } })

    await expect(
      fetchTaskOps({ ...config, sessionToken: 'stored-jwt' }, 'task-1'),
    ).resolves.toEqual({ ops: [], syncBlocks: [] })
    const editorCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/task-v3/'))
    expect(editorCall?.[1]).toMatchObject({
      headers: expect.objectContaining({ authorization: 'Bearer stored-jwt' }),
    })
  })

  it('reports an expired token instead of sending a doomed request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const expired = expiredJwt()
    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation(msg => errors.push(String(msg)))

    await expect(fetchTaskOps(config, 'task-1', expired)).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(errors.join('\n')).toMatch(/expired/)
    spy.mockRestore()

    await expect(
      updateSyncBlockContents(config, [{ id: 's1', ops: [{ insert: 'x' }] }], expired),
    ).rejects.toThrow(/expired/)
  })

  it('requires a session token only when synced content has a body to update', async () => {
    await expect(updateSyncBlockContents(config, [])).resolves.toBeUndefined()
    await expect(
      updateSyncBlockContents(config, [{ id: 's1', ops: [{ insert: 'Updated' }] }]),
    ).rejects.toThrow('CU_SESSION_TOKEN')
  })

  it('handshakes once per workspace', async () => {
    const fetchMock = stubFrontdoorFetch({ task: { content: JSON.stringify({ ops: [] }) } })
    await fetchTaskOps(config, 'task-1', 'jwt')
    await fetchTaskOps(config, 'task-2', 'jwt')
    const handshakes = fetchMock.mock.calls.filter(call =>
      String(call[0]).includes('/shard/v1/handshake/'),
    )
    expect(handshakes).toHaveLength(1)
  })

  it('throws when a Synced Content update cannot discover a host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ err: 'nope' }, 500))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      updateSyncBlockContents(config, [{ id: 's1', ops: [{ insert: 'Updated' }] }], 'jwt'),
    ).rejects.toThrow(/handshake failed/)
  })
})
