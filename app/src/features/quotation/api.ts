import http from '@/api/http'
import { lan } from '@/lang'
import type {
  BomFilter,
  CalculateRequest,
  OrderSummary,
  QuotationPlan,
  QuotationSettings,
} from './model'
import { fileNameFrom, normalizeSettings } from './model'

/** The backend wraps every answer as { status, message, object } and may answer HTTP 200 with status 4xx. */
interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is already localized. */
export class QuotationApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'QuotationApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new QuotationApiError(env.status, env.message)
  return env.object
}

const BASE = '/quotations'
/** The old ERP queries can take longer than the default 10 s. */
const SLOW = { timeout: 60000 }

export const quotationApi = {
  async status(): Promise<{ available: boolean }> {
    return unwrap((await http.get<Envelope<{ available: boolean }>>(`${BASE}/status`)).data)
  },
  /** Orders whose purchase plan is made and nothing is bought yet. */
  async orders(bom: BomFilter, keyword: string, refresh = false): Promise<OrderSummary[]> {
    const params: Record<string, string | boolean> = { bom }
    if (keyword.trim()) params.keyword = keyword.trim()
    if (refresh) params.refresh = true
    return unwrap(
      (await http.get<Envelope<OrderSummary[]>>(`${BASE}/orders`, { ...SLOW, params })).data,
    )
  },
  async plan(orderNo: string, req: CalculateRequest): Promise<QuotationPlan> {
    return unwrap(
      (
        await http.post<Envelope<QuotationPlan>>(`${BASE}/plan`, req, {
          ...SLOW,
          params: { orderNo },
        })
      ).data,
    )
  },
  /** Downloads the .xlsx file of the plan; returns the file name. */
  async exportExcel(orderNo: string, req: CalculateRequest): Promise<string> {
    let resp
    try {
      resp = await http.post<Blob>(`${BASE}/export`, req, {
        ...SLOW,
        params: { orderNo },
        responseType: 'blob',
      })
    } catch (e) {
      // Errors come back as a JSON envelope inside the blob.
      const data = (e as { response?: { data?: unknown; status?: number } }).response?.data
      if (data instanceof Blob) {
        try {
          const env = JSON.parse(await data.text()) as Envelope<unknown>
          throw new QuotationApiError(env.status, env.message)
        } catch (inner) {
          if (inner instanceof QuotationApiError) throw inner
        }
      }
      throw e
    }
    const name = fileNameFrom(
      resp.headers['content-disposition'] as string | undefined,
      `${lan.quotationFilePrefix ?? 'quotation'}_${orderNo}.xlsx`,
    )
    const url = URL.createObjectURL(resp.data)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return name
  },
  async settings(): Promise<QuotationSettings> {
    return unwrap((await http.get<Envelope<QuotationSettings>>(`${BASE}/settings`)).data)
  },
  async saveSettings(s: QuotationSettings): Promise<QuotationSettings> {
    return unwrap(
      (await http.put<Envelope<QuotationSettings>>(`${BASE}/settings`, normalizeSettings(s))).data,
    )
  },
}
