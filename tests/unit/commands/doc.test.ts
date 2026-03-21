import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDocPage = vi.fn()
const mockCreateDoc = vi.fn()
const mockCreateDocPage = vi.fn()
const mockEditDocPage = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getDocPage: mockGetDocPage,
    createDoc: mockCreateDoc,
    createDocPage: mockCreateDocPage,
    editDocPage: mockEditDocPage,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('getDocPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns doc page from API', async () => {
    const page = { id: 'p1', doc_id: 'd1', name: 'Intro', content: '# Hello' }
    mockGetDocPage.mockResolvedValue(page)
    const { getDocPage } = await import('../../../src/commands/doc.js')
    const result = await getDocPage(mockConfig, 'd1', 'p1')
    expect(result).toEqual(page)
    expect(mockGetDocPage).toHaveBeenCalledWith('team1', 'd1', 'p1')
  })
})

describe('createDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a doc and returns id and title', async () => {
    mockCreateDoc.mockResolvedValue({ id: 'd1', name: 'New Doc', workspace_id: 1 })
    const { createDoc } = await import('../../../src/commands/doc.js')
    const result = await createDoc(mockConfig, 'New Doc')
    expect(result).toEqual({ id: 'd1', title: 'New Doc' })
    expect(mockCreateDoc).toHaveBeenCalledWith('team1', 'New Doc', undefined)
  })

  it('passes content when provided', async () => {
    mockCreateDoc.mockResolvedValue({ id: 'd1', name: 'Doc', workspace_id: 1 })
    const { createDoc } = await import('../../../src/commands/doc.js')
    await createDoc(mockConfig, 'Doc', '# Content')
    expect(mockCreateDoc).toHaveBeenCalledWith('team1', 'Doc', '# Content')
  })

  it('throws on empty title', async () => {
    const { createDoc } = await import('../../../src/commands/doc.js')
    await expect(createDoc(mockConfig, '  ')).rejects.toThrow('Doc title cannot be empty')
  })
})

describe('createDocPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a page in a doc', async () => {
    const page = { id: 'p1', doc_id: 'd1', name: 'Page 1' }
    mockCreateDocPage.mockResolvedValue(page)
    const { createDocPage } = await import('../../../src/commands/doc.js')
    const result = await createDocPage(mockConfig, 'd1', 'Page 1')
    expect(result).toEqual(page)
    expect(mockCreateDocPage).toHaveBeenCalledWith('team1', 'd1', 'Page 1', undefined, undefined)
  })

  it('passes content and parentPageId when provided', async () => {
    const page = { id: 'p2', doc_id: 'd1', name: 'Sub Page' }
    mockCreateDocPage.mockResolvedValue(page)
    const { createDocPage } = await import('../../../src/commands/doc.js')
    await createDocPage(mockConfig, 'd1', 'Sub Page', '# Content', 'p1')
    expect(mockCreateDocPage).toHaveBeenCalledWith('team1', 'd1', 'Sub Page', '# Content', 'p1')
  })

  it('throws on empty name', async () => {
    const { createDocPage } = await import('../../../src/commands/doc.js')
    await expect(createDocPage(mockConfig, 'd1', '  ')).rejects.toThrow('Page name cannot be empty')
  })
})

describe('editDocPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('edits a doc page with name and content', async () => {
    const page = { id: 'p1', doc_id: 'd1', name: 'Updated' }
    mockEditDocPage.mockResolvedValue(page)
    const { editDocPage } = await import('../../../src/commands/doc.js')
    const result = await editDocPage(mockConfig, 'd1', 'p1', {
      name: 'Updated',
      content: '# New',
    })
    expect(result).toEqual(page)
    expect(mockEditDocPage).toHaveBeenCalledWith('team1', 'd1', 'p1', {
      name: 'Updated',
      content: '# New',
    })
  })

  it('throws when no updates provided', async () => {
    const { editDocPage } = await import('../../../src/commands/doc.js')
    await expect(editDocPage(mockConfig, 'd1', 'p1', {})).rejects.toThrow(
      'Provide --name or --content to update',
    )
  })
})
