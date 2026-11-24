import http from '@/api/http'
import type { GroupForm, PlanGroupOverview, RefreshResult } from './model'
import { toGroupRequest } from './model'

/** The backend wraps every answer as { status, message, object } and may answer HTTP 200 with status 4xx. */
interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is already localized. */
export class PlanGroupApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'PlanGroupApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new PlanGroupApiError(env.status, env.message)
  return env.object
}

const BASE = '/followup-plan-groups'

export const planGroupApi = {
  /** The groups and every known plan type. */
  async overview(): Promise<PlanGroupOverview> {
    return unwrap((await http.get<Envelope<PlanGroupOverview>>(BASE)).data)
  },
  async create(form: GroupForm): Promise<PlanGroupOverview> {
    return unwrap((await http.post<Envelope<PlanGroupOverview>>(BASE, toGroupRequest(form))).data)
  },
  async update(id: number, form: GroupForm): Promise<PlanGroupOverview> {
    return unwrap(
      (await http.put<Envelope<PlanGroupOverview>>(`${BASE}/${id}`, toGroupRequest(form))).data,
    )
  },
  /** Removes the group; its plan types go back to the main task. */
  async remove(id: number): Promise<PlanGroupOverview> {
    return unwrap((await http.delete<Envelope<PlanGroupOverview>>(`${BASE}/${id}`)).data)
  },
  /** Adds a plan type by hand, before the sync has seen it. */
  async addType(code: string, name: string, groupId: number | null): Promise<PlanGroupOverview> {
    return unwrap(
      (
        await http.post<Envelope<PlanGroupOverview>>(`${BASE}/types`, {
          code: code.trim(),
          name: name.trim() || null,
          groupId,
        })
      ).data,
    )
  },
  /** Renames a plan type or moves it to another group (null = main task). */
  async updateType(
    id: number,
    name: string | null,
    groupId: number | null,
  ): Promise<PlanGroupOverview> {
    return unwrap(
      (await http.put<Envelope<PlanGroupOverview>>(`${BASE}/types/${id}`, { name, groupId })).data,
    )
  },
  /** Re-splits every open order's follow-up with the current groups. */
  async apply(): Promise<RefreshResult> {
    return unwrap((await http.post<Envelope<RefreshResult>>(`${BASE}/apply`)).data)
  },
}
