import http from '@/api/http'
import type { FollowUpTemplate, TemplateForm } from './model'
import { toTemplateRequest } from './model'

/** The backend wraps every answer as { status, message, object } and may answer HTTP 200 with status 4xx. */
interface Envelope<T> {
  status: number
  message: string
  object: T
}

/** Thrown when the backend answers with a status other than 200; the message is already localized. */
export class TemplateApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'TemplateApiError'
  }
}

function unwrap<T>(env: Envelope<T>): T {
  if (env.status !== 200) throw new TemplateApiError(env.status, env.message)
  return env.object
}

export const templateApi = {
  /** Active templates, the default first. */
  async list(): Promise<FollowUpTemplate[]> {
    return unwrap((await http.get<Envelope<FollowUpTemplate[]>>('/followup-templates')).data)
  },
  async create(form: TemplateForm): Promise<FollowUpTemplate> {
    return unwrap(
      (await http.post<Envelope<FollowUpTemplate>>('/followup-templates', toTemplateRequest(form)))
        .data,
    )
  },
  async update(id: number, form: TemplateForm): Promise<FollowUpTemplate> {
    return unwrap(
      (
        await http.put<Envelope<FollowUpTemplate>>(
          `/followup-templates/${id}`,
          toTemplateRequest(form),
        )
      ).data,
    )
  },
  /** New purchase orders get this template. Answers the new list. */
  async makeDefault(id: number): Promise<FollowUpTemplate[]> {
    return unwrap(
      (await http.post<Envelope<FollowUpTemplate[]>>(`/followup-templates/${id}/default`)).data,
    )
  },
  /** Hides the template; orders that use it keep their tasks. Answers the new list. */
  async remove(id: number): Promise<FollowUpTemplate[]> {
    return unwrap(
      (await http.delete<Envelope<FollowUpTemplate[]>>(`/followup-templates/${id}`)).data,
    )
  },
  /**
   * Switches one follow-up task series of a purchase order (the main one, or a
   * plan group's own when planGroupId is given) to a template and re-plans its
   * open tasks. Answers how many are open.
   */
  async applyToOrder(
    purchaseOrderId: number,
    templateId: number,
    planGroupId: number | null = null,
  ): Promise<number> {
    const result = unwrap(
      (
        await http.put<Envelope<{ openTasks: number }>>(
          `/purchase-orders/${purchaseOrderId}/followup-template`,
          { templateId, planGroupId },
        )
      ).data,
    )
    return result.openTasks
  },
}
