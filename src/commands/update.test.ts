import { describe, it, expect, vi } from 'vitest'

const mockUpdateDesc = vi.fn().mockResolvedValue({ id: 't1', name: 'Task', description: 'new desc' })

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    updateTaskDescription: mockUpdateDesc
  }))
}))

describe('updateDescription', () => {
  it('calls API with correct task id and description', async () => {
    const { updateDescription } = await import('./update.js')
    const result = await updateDescription(
      { apiToken: 'pk_t', lists: [] },
      't1',
      'new description'
    )
    expect(mockUpdateDesc).toHaveBeenCalledWith('t1', 'new description')
    expect(result.id).toBe('t1')
  })

  it('throws when description is empty string', async () => {
    const { updateDescription } = await import('./update.js')
    await expect(
      updateDescription({ apiToken: 'pk_t', lists: [] }, 't1', '')
    ).rejects.toThrow('cannot be empty')
  })

  it('throws when description is only whitespace', async () => {
    const { updateDescription } = await import('./update.js')
    await expect(
      updateDescription({ apiToken: 'pk_t', lists: [] }, 't1', '   ')
    ).rejects.toThrow('cannot be empty')
  })
})
