import http from '@/api/http'
import type { PmcDashboard, PurchasingDashboard } from './model'

interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is already localized. */
export class DashboardApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'DashboardApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new DashboardApiError(env.status, env.message)
  return env.object
}

export const dashboardApi = {
  async pmc(): Promise<PmcDashboard> {
    return unwrap((await http.get<Envelope<PmcDashboard>>('/dashboards/pmc')).data)
  },
  async purchasing(): Promise<PurchasingDashboard> {
    return unwrap((await http.get<Envelope<PurchasingDashboard>>('/dashboards/purchasing')).data)
  },
}
