// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
import { TemplateApiError, templateApi } from '../api'
import { emptyTemplateForm } from '../model'

const ok = (object: unknown) => ({ data: { status: 200, message: 'OK', object } })

afterEach(() => vi.clearAllMocks())

describe('follow-up template API', () => {
  it('calls each endpoint', async () => {
    http.get.mockResolvedValue(ok([]))
    http.post.mockResolvedValue(ok({ id: 1 }))
    http.put.mockResolvedValue(ok({ openTasks: 3 }))
    http.delete.mockResolvedValue(ok([]))
    const form = { ...emptyTemplateForm(), name: 'A', notifyDays: [3] }

    await templateApi.list()
    expect(http.get).toHaveBeenCalledWith('/followup-templates')
    await templateApi.create(form)
    expect(http.post).toHaveBeenCalledWith(
      '/followup-templates',
      expect.objectContaining({ name: 'A', notifyDays: [3] }),
    )
    await templateApi.makeDefault(4)
    expect(http.post).toHaveBeenCalledWith('/followup-templates/4/default')
    await templateApi.remove(4)
    expect(http.delete).toHaveBeenCalledWith('/followup-templates/4')
    await expect(templateApi.applyToOrder(42, 4)).resolves.toBe(3)
    expect(http.put).toHaveBeenCalledWith('/purchase-orders/42/followup-template', {
      templateId: 4,
      planGroupId: null,
    })
    await templateApi.applyToOrder(42, 4, 7)
    expect(http.put).toHaveBeenLastCalledWith('/purchase-orders/42/followup-template', {
      templateId: 4,
      planGroupId: 7,
    })
  })

  it('turns an error status inside the envelope into an error with the backend message', async () => {
    http.post.mockResolvedValue({
      data: { status: 409, message: 'The default template cannot be removed', object: null },
    })
    const err = await templateApi.makeDefault(1).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(TemplateApiError)
    expect((err as TemplateApiError).status).toBe(409)
    expect((err as TemplateApiError).message).toBe('The default template cannot be removed')
  })
})
