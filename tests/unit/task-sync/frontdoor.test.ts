import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchTaskOps, updateSyncBlockContents } from '../../../src/task-sync/frontdoor.js'

const config = { apiToken: 'pk_test', teamId: '2304761' }

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.CU_SESSION_TOKEN
})

describe('Synced Content frontdoor integration', () => {
  it('pulls task ops and backing synced block content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          task: { content: JSON.stringify({ ops: [{ insert: { 'sync-block': { id: 's1' } } }] }) },
          sync_blocks: [
            {
              id: 's1',
              content: JSON.stringify({ ops: [{ insert: 'Shared' }, { insert: '\n' }] }),
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTaskOps(config, 'task-1', 'jwt')).resolves.toEqual({
      ops: [{ insert: { 'sync-block': { id: 's1' } } }],
      syncBlocks: [{ id: 's1', ops: [{ insert: 'Shared' }, { insert: '\n' }] }],
    })
    expect(fetchMock.mock.calls[0]?.[0]).toContain('fields%5B%5D=sync_blocks')
  })

  it('updates backing synced block content with the session endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await updateSyncBlockContents(
      config,
      [{ id: 's1', ops: [{ insert: 'Updated' }, { insert: '\n' }] }],
      'jwt',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/docs-service-v3/core/workspaces/2304761/syncBlocks/s1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          content: JSON.stringify({ ops: [{ insert: 'Updated' }, { insert: '\n' }] }),
        }),
      }),
    )
  })

  it('requires a session token only when synced content has a body to update', async () => {
    await expect(updateSyncBlockContents(config, [])).resolves.toBeUndefined()
    await expect(
      updateSyncBlockContents(config, [{ id: 's1', ops: [{ insert: 'Updated' }] }]),
    ).rejects.toThrow('CU_SESSION_TOKEN')
  })
})
