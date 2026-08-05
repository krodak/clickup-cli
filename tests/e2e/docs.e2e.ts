import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../../src/api.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('Doc lifecycle e2e', () => {
  let client: ClickUpClient
  let teamId: string
  let docId: string
  let pageId: string
  let subPageId: string

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    teamId = teams[0]!.id
  })

  afterAll(async () => {
    if (subPageId) await client.deleteDocPage(teamId, docId, subPageId).catch(() => {})
    // Docs cannot be deleted: ClickUp's public API exposes no delete-Doc endpoint
    // (returns HTTP 405), so the created Doc is left behind by design.
  })

  it('creates a doc with a persisted name', async () => {
    const doc = await client.createDoc(teamId, 'E2E Doc Test')
    docId = doc.id
    expect(doc.id).toBeTypeOf('string')
    // Regression: the Doc used to come back unnamed because `title` was sent
    // instead of `name`, and the API ignored it while still returning 201.
    expect(doc.name).toBe('E2E Doc Test')
    const persisted = await client.getDoc(teamId, docId)
    expect(persisted.name).toBe('E2E Doc Test')
  })

  it('creates a doc whose root page carries the title and content', async () => {
    const { createDoc } = await import('../../src/commands/doc.js')
    const created = await createDoc({ apiToken: TOKEN!, teamId }, 'E2E Doc Content', '# Hello')
    const pages = await client.getDocPages(teamId, created.id)
    expect(pages.length).toBeGreaterThan(0)
    expect(pages[0]!.name).toBe('E2E Doc Content')
    expect(pages[0]!.content).toContain('Hello')
  })

  it('lists docs and finds the created one', async () => {
    const docs = await client.getDocs(teamId)
    const found = docs.find(d => d.id === docId)
    expect(found).toBeDefined()
  })

  it('gets doc details', async () => {
    const doc = await client.getDoc(teamId, docId)
    expect(doc.id).toBe(docId)
  })

  it('lists pages via getDocPageListing', async () => {
    const pages = await client.getDocPageListing(teamId, docId)
    expect(Array.isArray(pages)).toBe(true)
    expect(pages.length).toBeGreaterThan(0)
    pageId = pages[0]!.id
  })

  it('gets pages with content via getDocPages', async () => {
    const pages = await client.getDocPages(teamId, docId)
    expect(Array.isArray(pages)).toBe(true)
    expect(pages.length).toBeGreaterThan(0)
  })

  it('gets a single page', async () => {
    const page = await client.getDocPage(teamId, docId, pageId)
    expect(page.id).toBe(pageId)
  })

  it('creates a sub-page', async () => {
    const page = await client.createDocPage(
      teamId,
      docId,
      'E2E Sub Page',
      'Sub page content',
      pageId,
    )
    subPageId = page.id
    expect(page.id).toBeTypeOf('string')
  })

  it('edits a page', async () => {
    await expect(
      client.editDocPage(teamId, docId, subPageId, { name: 'E2E Sub Page EDITED' }),
    ).resolves.not.toThrow()
  })
})
