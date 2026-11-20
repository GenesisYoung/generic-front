import http from '@/api/http'
import type { CustomerOrderPage, ListView, SyncState } from './model'

/** The backend wraps every answer as { status, message, object } and may answer HTTP 200 with status 4xx. */
interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is safe to show. */
export class CustomerOrderApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'CustomerOrderApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new CustomerOrderApiError(env.status, env.message)
  return env.object
}

export const customerOrderApi = {
  /** pending: open orders with no order audit yet; all: every synced order (searchable). */
  async list(view: ListView, page: number, size: number, q = ''): Promise<CustomerOrderPage> {
    const params: Record<string, string | number> = { view, page, size }
    if (view === 'all' && q.trim()) params.q = q.trim()
    return unwrap(
      (await http.get<Envelope<CustomerOrderPage>>('/customer-orders', { params })).data,
    )
  },
  async syncStatus(): Promise<SyncState | null> {
    return unwrap((await http.get<Envelope<SyncState | null>>('/customer-orders/sync/status')).data)
  },
  /** Runs the sync now. Rejects with the backend's (localized) message when it is off or fails. */
  async syncNow(): Promise<void> {
    unwrap((await http.post<Envelope<unknown>>('/customer-orders/sync')).data)
  },
}
