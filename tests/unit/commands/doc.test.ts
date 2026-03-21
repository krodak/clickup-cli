import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDoc = vi.fn()
const mockGetDocPageListing = vi.fn()
const mockGetDocPage = vi.fn()
const mockGetDocPages = vi.fn()
const mockCreateDoc = vi.fn()
const mockCreateDocPage = vi.fn()
const mockEditDocPage = vi.fn()
const mockDeleteDoc = vi.fn()
const mockDeleteDocPage = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getDoc: mockGetDoc,
    getDocPageListing: mockGetDocPageListing,
    getDocPage: mockGetDocPage,
    getDocPages: mockGetDocPages,
    createDoc: mockCreateDoc,
    createDocPage: mockCreateDocPage,
    editDocPage: mockEditDocPage,
    deleteDoc: mockDeleteDoc,
    deleteDocPage: mockDeleteDocPage,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('getDocInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns doc metadata and page listing', async () => {
    const doc = { id: 'd1', name: 'My Doc', workspace_id: 1 }
    const pages = [{ id: 'p1', doc_id: 'd1', name: 'Page 1' }]
    mockGetDoc.mockResolvedValue(doc)
    mockGetDocPageListing.mockResolvedValue(pages)
    const { getDocInfo } = await import('../../../src/commands/doc.js')
    const result = await getDocInfo(mockConfig, 'd1')
    expect(result.doc).toEqual(doc)
    expect(result.pages).toEqual(pages)
    expect(mockGetDoc).toHaveBeenCalledWith('team1', 'd1')
    expect(mockGetDocPageListing).toHaveBeenCalledWith('team1', 'd1')
  })
})

describe('formatDocInfoMarkdown', () => {
  it('renders doc name and page tree', async () => {
    const { formatDocInfoMarkdown } = await import('../../../src/commands/doc.js')
    const result = formatDocInfoMarkdown({ id: 'd1', name: 'My Doc', workspace_id: 1 }, [
      { id: 'p1', doc_id: 'd1', name: 'Intro' },
    ])
    expect(result).toContain('# My Doc')
    expect(result).toContain('d1')
    expect(result).toContain('**Intro**')
    expect(result).toContain('p1')
  })

  it('shows "No pages" when empty', async () => {
    const { formatDocInfoMarkdown } = await import('../../../src/commands/doc.js')
    const result = formatDocInfoMarkdown({ id: 'd1', name: 'Empty Doc', workspace_id: 1 }, [])
    expect(result).toContain('No pages.')
  })
})

describe('getAllDocPages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all pages with content', async () => {
    const pages = [
      { id: 'p1', doc_id: 'd1', name: 'Page 1', content: '# Hello' },
      { id: 'p2', doc_id: 'd1', name: 'Page 2', content: '# World' },
    ]
    mockGetDocPages.mockResolvedValue(pages)
    const { getAllDocPages } = await import('../../../src/commands/doc.js')
    const result = await getAllDocPages(mockConfig, 'd1')
    expect(result).toEqual(pages)
    expect(mockGetDocPages).toHaveBeenCalledWith('team1', 'd1')
  })
})

describe('formatDocPagesMarkdown', () => {
  it('returns "No pages found" for empty array', async () => {
    const { formatDocPagesMarkdown } = await import('../../../src/commands/doc.js')
    expect(formatDocPagesMarkdown([])).toBe('No pages found')
  })

  it('renders all pages with content separated by hr', async () => {
    const { formatDocPagesMarkdown } = await import('../../../src/commands/doc.js')
    const result = formatDocPagesMarkdown([
      { id: 'p1', doc_id: 'd1', name: 'Intro', content: 'Hello' },
      { id: 'p2', doc_id: 'd1', name: 'Setup', content: 'World' },
    ])
    expect(result).toContain('# Intro')
    expect(result).toContain('Hello')
    expect(result).toContain('---')
    expect(result).toContain('# Setup')
    expect(result).toContain('World')
  })
})

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

describe('deleteDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a doc via API', async () => {
    mockDeleteDoc.mockResolvedValue(undefined)
    const { deleteDoc } = await import('../../../src/commands/doc.js')
    await deleteDoc(mockConfig, 'd1')
    expect(mockDeleteDoc).toHaveBeenCalledWith('team1', 'd1')
  })
})

describe('deleteDocPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a doc page via API', async () => {
    mockDeleteDocPage.mockResolvedValue(undefined)
    const { deleteDocPage } = await import('../../../src/commands/doc.js')
    await deleteDocPage(mockConfig, 'd1', 'p1')
    expect(mockDeleteDocPage).toHaveBeenCalledWith('team1', 'd1', 'p1')
  })
})
