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
      { apiToken: 'pk_t', teamId: 'tm_1', lists: [] },
      't1',
      'new description'
    )
    expect(mockUpdateDesc).toHaveBeenCalledWith('t1', 'new description')
    expect(result.id).toBe('t1')
  })
})
