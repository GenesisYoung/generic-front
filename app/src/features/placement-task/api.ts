import http from '@/api/http'
import type { PlacementPage, PlacementTask, Purchaser } from './model'

/** The backend wraps every answer as { status, message, object } and may answer HTTP 200 with status 4xx. */
interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is already localized. */
export class PlacementApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'PlacementApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new PlacementApiError(env.status, env.message)
  return env.object
}

export const placementApi = {
  /** openOnly: open tasks, nearest deadline first; otherwise open and done, newest first. */
  async list(openOnly: boolean, page: number, size: number): Promise<PlacementPage> {
    return unwrap(
      (
        await http.get<Envelope<PlacementPage>>('/placement-tasks', {
          params: { openOnly, page, size },
        })
      ).data,
    )
  },
  async purchasers(): Promise<Purchaser[]> {
    return unwrap((await http.get<Envelope<Purchaser[]>>('/placement-tasks/purchasers')).data)
  },
  async assign(id: number, assigneeId: number): Promise<PlacementTask> {
    return unwrap(
      (await http.post<Envelope<PlacementTask>>(`/placement-tasks/${id}/assign`, { assigneeId }))
        .data,
    )
  },
  async complete(id: number, poNo: string): Promise<PlacementTask> {
    return unwrap(
      (await http.post<Envelope<PlacementTask>>(`/placement-tasks/${id}/complete`, { poNo })).data,
    )
  },
}
