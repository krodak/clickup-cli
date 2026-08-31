import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stringifyMarkdownFile } from '../../../src/task-sync/frontmatter.js'
import { contentHash } from '../../../src/task-sync/hash.js'
import { hasCufmConstructs, pullTaskToFile } from '../../../src/task-sync/pull.js'

const config = { apiToken: 'pk_test', teamId: '2304761' }

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.CU_SESSION_TOKEN
})

async function fixture(body: string, opts?: { contentHash?: string }): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cup-pull-'))
  const file = join(dir, 'task.md')
  await writeFile(
    file,
    stringifyMarkdownFile(
      {
        clickup_id: 'abc123',
        title: 'Task',
        list_id: '901',
        content_hash: opts?.contentHash ?? contentHash(body, []),
      },
      body,
    ),
  )
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

  it('refuses to overwrite unsynced local edits when the user declines', async () => {
    stubTaskFetch()
    const file = await fixture('Local edits that have not been pushed.\n', {
      contentHash: 'not-the-body-hash',
    })
    const before = await readFile(file, 'utf8')

    await expect(pullTaskToFile(config, 'abc123', file, { noInput: true })).rejects.toThrow(
      /unsynced local changes.*--force/s,
    )
    expect(await readFile(file, 'utf8')).toBe(before)
  })

  it('overwrites unsynced local edits when --force is given', async () => {
    stubTaskFetch()
    const file = await fixture('Local edits that have not been pushed.\n', {
      contentHash: 'not-the-body-hash',
    })

    const result = await pullTaskToFile(config, 'abc123', file, { noInput: true, force: true })

    expect(result.action).toBe('written')
    expect(await readFile(file, 'utf8')).toContain('Flattened body from ClickUp')
  })

  it('writes a new file without treating missing as dirty', async () => {
    stubTaskFetch()
    const file = join(await mkdtemp(join(tmpdir(), 'cup-pull-')), 'new.md')

    const result = await pullTaskToFile(config, 'abc123', file, { noInput: true })

    expect(result.action).toBe('written')
    expect(await readFile(file, 'utf8')).toContain('Flattened body from ClickUp')
  })
})
