// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
import { FollowUpApiError, followUpApi } from '../api'
import { emptyForm } from '../model'

afterEach(() => vi.clearAllMocks())

describe('follow-up API', () => {
  it('reads the to-do list from the envelope', async () => {
    http.get.mockResolvedValue({
      data: { status: 200, message: 'OK', object: [{ checkpointId: 1 }] },
    })
    await expect(followUpApi.todo()).resolves.toEqual([{ checkpointId: 1 }])
    expect(http.get).toHaveBeenCalledWith('/followups/todo')
  })

  it('posts the follow-up body to the order', async () => {
    http.post.mockResolvedValue({
      data: {
        status: 200,
        message: 'OK',
        object: { record: { id: 5 }, completedCheckpoint: null },
      },
    })
    await followUpApi.record(42, { ...emptyForm(), materialStatus: 'ON_TRACK', note: 'ok' })
    expect(http.post).toHaveBeenCalledWith('/purchase-orders/42/followups', {
      materialStatus: 'ON_TRACK',
      supplierPromisedDate: null,
      missingOrderFound: false,
      note: 'ok',
    })
  })

  it('completes one task by its id', async () => {
    http.post.mockResolvedValue({
      data: {
        status: 200,
        message: 'OK',
        object: { record: { id: 6 }, completedCheckpoint: { id: 3 } },
      },
    })
    await followUpApi.complete(3, { ...emptyForm(), materialStatus: 'AT_RISK' })
    expect(http.post).toHaveBeenCalledWith(
      '/followups/checkpoints/3/complete',
      expect.objectContaining({ materialStatus: 'AT_RISK', note: null }),
    )
  })

  it('turns an error status inside the envelope into an error with the backend message', async () => {
    http.post.mockResolvedValue({
      data: {
        status: 409,
        message: 'Purchase order PO-1 is RECEIVED and needs no follow-up',
        object: null,
      },
    })
    const err = await followUpApi
      .record(1, { ...emptyForm(), materialStatus: 'ON_TRACK' })
      .catch((e) => e)
    expect(err).toBeInstanceOf(FollowUpApiError)
    expect(err.status).toBe(409)
    expect(err.message).toContain('needs no follow-up')
  })
})
