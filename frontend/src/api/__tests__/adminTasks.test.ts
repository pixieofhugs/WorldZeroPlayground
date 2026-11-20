import { expect, it, vi } from 'vitest'
import { apiGet } from '../client'
import { getAllTasks } from '../admin'

vi.mock('../client', () => ({ apiGet: vi.fn(async () => ({ data: [] })) }))

it('the console list asks for every task type, or metatasks never show (#3727)', async () => {
  await getAllTasks()
  expect(apiGet).toHaveBeenCalledWith('/tasks', { params: { query: expect.objectContaining({ status: 'all', task_type: 'all' }) } })
})
