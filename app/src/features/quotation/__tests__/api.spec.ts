// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
import { QuotationApiError, quotationApi } from '../api'
import { emptyRequest } from '../model'

const ok = (object: unknown) => ({ data: { status: 200, message: 'OK', object } })

afterEach(() => vi.clearAllMocks())

describe('quotation API', () => {
  it('calls each endpoint', async () => {
    http.get.mockResolvedValue(ok([]))
    http.post.mockResolvedValue(ok({}))
    http.put.mockResolvedValue(ok({}))
    await quotationApi.orders('WITH', ' 263 ', true)
    expect(http.get).toHaveBeenCalledWith('/quotations/orders', {
      timeout: 60000,
      params: { bom: 'WITH', keyword: '263', refresh: true },
    })
    await quotationApi.plan('26394-W53', emptyRequest())
    expect(http.post).toHaveBeenCalledWith('/quotations/plan', emptyRequest(), {
      timeout: 60000,
      params: { orderNo: '26394-W53' },
    })
    await quotationApi.saveSettings({
      fees: [],
      marginTiers: [{ minAmount: '5' as unknown as number, ratePercent: 1 }],
      priceCheckLow: 0.8,
      priceCheckHigh: 1.2,
    })
    expect(http.put).toHaveBeenCalledWith(
      '/quotations/settings',
      expect.objectContaining({ marginTiers: [{ minAmount: 5, ratePercent: 1 }] }),
    )
  })

  it('throws the localized message of a 4xx envelope', async () => {
    http.post.mockResolvedValue({ data: { status: 404, message: '订单无法报价', object: null } })
    const err = await quotationApi.plan('X', emptyRequest()).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(QuotationApiError)
    expect((err as QuotationApiError).message).toBe('订单无法报价')
  })

  it('reads an export error from the JSON blob', async () => {
    const blob = new Blob([JSON.stringify({ status: 503, message: '未连接旧ERP', object: null })])
    http.post.mockRejectedValue({ response: { status: 503, data: blob } })
    const err = await quotationApi.exportExcel('X', emptyRequest()).catch((e: unknown) => e)
    expect((err as QuotationApiError).status).toBe(503)
    expect((err as QuotationApiError).message).toBe('未连接旧ERP')
  })
})
