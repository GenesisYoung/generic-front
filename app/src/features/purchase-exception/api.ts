import http from '@/api/http'
import type {
  ExceptionAction,
  ExceptionPage,
  ListView,
  PurchaseException,
  ReportForm,
} from './model'

/** The backend wraps every answer as { status, message, object } and may answer HTTP 200 with status 4xx. */
interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is already localized. */
export class ExceptionApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ExceptionApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new ExceptionApiError(env.status, env.message)
  return env.object
}

export const exceptionApi = {
  async list(view: ListView, page: number, size: number): Promise<ExceptionPage> {
    return unwrap(
      (
        await http.get<Envelope<ExceptionPage>>('/purchase-exceptions', {
          params: { view, page, size },
        })
      ).data,
    )
  },
  async detail(id: number): Promise<PurchaseException> {
    return unwrap((await http.get<Envelope<PurchaseException>>(`/purchase-exceptions/${id}`)).data)
  },
  async report(f: ReportForm): Promise<PurchaseException> {
    const body = {
      purchaseOrderId: f.purchaseOrderId,
      poNo: f.purchaseOrderId == null ? f.poNo.trim() : null,
      category: f.category,
      severity: f.severity,
      description: f.description.trim(),
      impactDate: f.impactDate || null,
    }
    return unwrap((await http.post<Envelope<PurchaseException>>('/purchase-exceptions', body)).data)
  },
  async act(
    id: number,
    action: ExceptionAction,
    comment: string,
    lockVersion: number,
  ): Promise<PurchaseException> {
    return unwrap(
      (
        await http.post<Envelope<PurchaseException>>(`/purchase-exceptions/${id}/actions`, {
          action,
          comment: comment.trim() || null,
          lockVersion,
        })
      ).data,
    )
  },
}
