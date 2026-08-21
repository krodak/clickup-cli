import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasCufmConstructs, pullTaskToFile } from '../../../src/task-sync/pull.js'

const config = { apiToken: 'pk_test', teamId: '2304761' }

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.CU_SESSION_TOKEN
})

async function fixture(body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cup-pull-'))
  const file = join(dir, 'task.md')
  await writeFile(file, `---\nclickup_id: abc123\ntitle: Task\nlist_id: '901'\n---\n\n${body}`)
  return file
}

// Only the remote GET matters here; there is no session token, so no frontdoor call is made.
function stubTaskFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'abc123',
          name: 'Task',
          url: 'https://app.clickup.com/t/abc123',
          list: { id: '901' },
          date_updated: '1',
          markdown_description: 'Flattened body from ClickUp\n',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ),
  )
}

describe('hasCufmConstructs', () => {
  it('recognises component blocks and diagram fences', () => {
    expect(hasCufmConstructs('::banner{color="blue"}\nHi\n::\n')).toBe(true)
    expect(hasCufmConstructs('```tldraw\n{"records":[]}\n```\n')).toBe(true)
    expect(hasCufmConstructs('  ::toggle\nnested\n::\n')).toBe(true)
    expect(hasCufmConstructs('# Plain\n\nJust text and a [link](https://x.dev).\n')).toBe(false)
    expect(hasCufmConstructs('Ratio 3::4 in prose is not a component.\n')).toBe(false)
  })
})

describe('pullTaskToFile without a session token', () => {
  it('refuses to flatten a file containing CUFM', async () => {
    stubTaskFetch()
    const file = await fixture('::banner{color="blue"}\nImportant\n::\n')
    const before = await readFile(file, 'utf8')

    await expect(pullTaskToFile(config, 'abc123', file, { noInput: true })).rejects.toThrow(
      /--lossy/,
    )
    expect(await readFile(file, 'utf8')).toBe(before)
  })

  it('proceeds when --lossy is given, and reports the pull as lossy', async () => {
    stubTaskFetch()
    const file = await fixture('::banner{color="blue"}\nImportant\n::\n')

    const result = await pullTaskToFile(config, 'abc123', file, { noInput: true, lossy: true })

    expect(result.lossless).toBe(false)
    expect(await readFile(file, 'utf8')).toContain('Flattened body from ClickUp')
  })

  it('does not block a plain-markdown file', async () => {
    stubTaskFetch()
    const file = await fixture('Just a paragraph.\n')

    const result = await pullTaskToFile(config, 'abc123', file, { noInput: true })

    expect(result.action).toBe('written')
    expect(result.lossless).toBe(false)
  })
})
