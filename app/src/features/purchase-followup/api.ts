import http from '@/api/http'
import type { Checkpoint, FollowUpForm, FollowUpRecord, SavedFollowUp, TodoItem } from './model'
import { toRequest } from './model'

/** The backend wraps every answer as { status, message, object } and may answer HTTP 200 with status 4xx. */
interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is safe to show. */
export class FollowUpApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'FollowUpApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new FollowUpApiError(env.status, env.message)
  return env.object
}

export interface OrderFollowUps {
  order: { id: number; externalPoNo: string; supplierName: string | null; status: string }
  checkpoints: Checkpoint[]
  records: FollowUpRecord[]
}

export const followUpApi = {
  /** My checkpoints whose window is open now, the ones ending first on top. */
  async todo(): Promise<TodoItem[]> {
    return unwrap((await http.get<Envelope<TodoItem[]>>('/followups/todo')).data)
  },
  /** The order with its checkpoints and records (newest first). */
  async orderFollowUps(purchaseOrderId: number): Promise<OrderFollowUps> {
    return unwrap(
      (await http.get<Envelope<OrderFollowUps>>(`/purchase-orders/${purchaseOrderId}/followups`))
        .data,
    )
  },
  /** Marks one follow-up task complete, saving the follow-up written for it. */
  async complete(checkpointId: number, form: FollowUpForm): Promise<SavedFollowUp> {
    return unwrap(
      (
        await http.post<Envelope<SavedFollowUp>>(
          `/followups/checkpoints/${checkpointId}/complete`,
          toRequest(form),
        )
      ).data,
    )
  },
  /** Saves a follow-up; completes the open window that contains today, if any. */
  async record(purchaseOrderId: number, form: FollowUpForm): Promise<SavedFollowUp> {
    return unwrap(
      (
        await http.post<Envelope<SavedFollowUp>>(
          `/purchase-orders/${purchaseOrderId}/followups`,
          toRequest(form),
        )
      ).data,
    )
  },
}
