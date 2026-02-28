import { describe, it, expect, vi } from 'vitest'

const mockGetMe = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMe: mockGetMe,
  })),
}))

describe('checkAuth', () => {
  it('returns user info on valid token', async () => {
    mockGetMe.mockResolvedValue({ id: 123, username: 'testuser' })
    const { checkAuth } = await import('../../../src/commands/auth.js')
    const result = await checkAuth({ apiToken: 'pk_test', teamId: 'team_1' })
    expect(result).toEqual({
      authenticated: true,
      user: { id: 123, username: 'testuser' },
    })
  })

  it('returns error on invalid token', async () => {
    mockGetMe.mockRejectedValue(new Error('ClickUp API error 401: Token invalid'))
    const { checkAuth } = await import('../../../src/commands/auth.js')
    const result = await checkAuth({ apiToken: 'pk_bad', teamId: 'team_1' })
    expect(result).toEqual({
      authenticated: false,
      error: 'ClickUp API error 401: Token invalid',
    })
  })
})
