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
    if (docId) await client.deleteDoc(teamId, docId).catch(() => {})
  })

  it('creates a doc', async () => {
    const doc = await client.createDoc(teamId, 'E2E Doc Test')
    docId = doc.id
    expect(doc.id).toBeTypeOf('string')
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
