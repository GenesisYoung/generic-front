// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
import { PlanGroupApiError, planGroupApi } from '../api'
import { emptyGroupForm } from '../model'

const ok = (object: unknown) => ({ data: { status: 200, message: 'OK', object } })
const overview = { groups: [], types: [], linesSynced: true }

afterEach(() => vi.clearAllMocks())

describe('plan group API', () => {
  it('calls each endpoint', async () => {
    http.get.mockResolvedValue(ok(overview))
    http.post.mockResolvedValue(ok(overview))
    http.put.mockResolvedValue(ok(overview))
    http.delete.mockResolvedValue(ok(overview))
    const form = { ...emptyGroupForm(), name: ' Hardware ', typeCodes: ['HW'] }

    await expect(planGroupApi.overview()).resolves.toEqual(overview)
    expect(http.get).toHaveBeenCalledWith('/followup-plan-groups')
    await planGroupApi.create(form)
    expect(http.post).toHaveBeenCalledWith('/followup-plan-groups', {
      name: 'Hardware',
      separate: true,
      templateId: null,
      note: null,
      typeCodes: ['HW'],
    })
    await planGroupApi.update(3, form)
    expect(http.put).toHaveBeenCalledWith(
      '/followup-plan-groups/3',
      expect.objectContaining({ name: 'Hardware' }),
    )
    await planGroupApi.remove(3)
    expect(http.delete).toHaveBeenCalledWith('/followup-plan-groups/3')
    await planGroupApi.addType(' EL ', ' ', 3)
    expect(http.post).toHaveBeenLastCalledWith('/followup-plan-groups/types', {
      code: 'EL',
      name: null,
      groupId: 3,
    })
    await planGroupApi.updateType(8, '电子料', null)
    expect(http.put).toHaveBeenLastCalledWith('/followup-plan-groups/types/8', {
      name: '电子料',
      groupId: null,
    })
    http.post.mockResolvedValue(ok({ orders: 2, seriesStarted: 1, seriesEnded: 0 }))
    await expect(planGroupApi.apply()).resolves.toEqual({
      orders: 2,
      seriesStarted: 1,
      seriesEnded: 0,
    })
    expect(http.post).toHaveBeenLastCalledWith('/followup-plan-groups/apply')
  })

  it('turns an error status inside the envelope into an error with the backend message', async () => {
    http.post.mockResolvedValue({ data: { status: 409, message: 'exists', object: null } })
    const err = await planGroupApi.addType('HW', '', null).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(PlanGroupApiError)
    expect((err as PlanGroupApiError).status).toBe(409)
    expect((err as PlanGroupApiError).message).toBe('exists')
  })
})
