import http from '@/api/http'
import type { Action, ActionInput, Draft, Metadata, Page, Query, Task } from './model'
export interface AuditApi {
  metadata(): Promise<Metadata>
  list(q: Query): Promise<Page>
  detail(id: string): Promise<Task>
  save(draft: Draft, id?: string, lockVersion?: number): Promise<Task>
  act(id: string, action: Action, input: ActionInput): Promise<Task>
}
const root = '/pmc/order-audit-tasks'
export const auditApi: AuditApi = {
  async metadata() {
    return (await http.get<Metadata>(`${root}/metadata`)).data
  },
  async list(q) {
    return (await http.get<Page>(root, { params: q })).data
  },
  async detail(id) {
    return (await http.get<Task>(`${root}/${encodeURIComponent(id)}`)).data
  },
  async save(draft, id, lockVersion) {
    const headers = { 'Idempotency-Key': crypto.randomUUID() }
    return id
      ? (
          await http.put<Task>(
            `${root}/${encodeURIComponent(id)}`,
            { ...draft, lockVersion },
            { headers },
          )
        ).data
      : (await http.post<Task>(root, draft, { headers })).data
  },
  async act(id, action, input) {
    return (
      await http.post<Task>(`${root}/${encodeURIComponent(id)}/actions/${action}`, input, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
    ).data
  },
}

export interface EvidenceReceipt {
  evidenceRef: string
  fileName: string
  size: number
  uploadedAt: string
}
export async function uploadAuditEvidence(
  id: string,
  file: File,
  purpose: string,
  lockVersion: number,
): Promise<EvidenceReceipt> {
  const data = new FormData()
  data.append('file', file)
  data.append('purpose', purpose)
  data.append('lockVersion', String(lockVersion))
  return (
    await http.post<EvidenceReceipt>(`${root}/${encodeURIComponent(id)}/evidence`, data, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    })
  ).data
}

import type {
  ChangeInput,
  ConfirmationInput,
  DecisionInput,
  Rule,
  RuleState,
  Submission,
} from './model'
const writeOptions = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })
export const auditWorkflowApi = {
  async rules() {
    return (await http.get<RuleState>(`${root}/rules`)).data
  },
  async saveRule(rule: Rule) {
    return (await http.put<RuleState>(`${root}/rules/default/draft`, rule, writeOptions())).data
  },
  async decideRule(input: {
    ruleVersion: number
    decision: 'APPROVED' | 'REJECTED'
    reason: string
    evidenceRef: string
  }) {
    return (await http.post<RuleState>(`${root}/rules/default/approval`, input, writeOptions()))
      .data
  },
  async confirm(id: string, input: ConfirmationInput) {
    return (
      await http.post<Task>(
        `${root}/${encodeURIComponent(id)}/business-confirmations`,
        input,
        writeOptions(),
      )
    ).data
  },
  async requestChange(id: string, input: ChangeInput) {
    return (
      await http.post<Task>(
        `${root}/${encodeURIComponent(id)}/change-requests`,
        input,
        writeOptions(),
      )
    ).data
  },
  async decideChange(id: string, requestId: string, input: DecisionInput) {
    return (
      await http.post<Task>(
        `${root}/${encodeURIComponent(id)}/change-requests/${encodeURIComponent(requestId)}/decision`,
        input,
        writeOptions(),
      )
    ).data
  },
  async snapshot(id: string, version: number) {
    return (await http.get<Submission>(`${root}/${encodeURIComponent(id)}/submissions/${version}`))
      .data
  },
  async download(id: string, ref: string) {
    const response = await http.get<Blob>(
      `${root}/${encodeURIComponent(id)}/evidence/${encodeURIComponent(ref)}/download`,
      { responseType: 'blob' },
    )
    const disposition = String(response.headers?.['content-disposition'] || '')
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const plain = disposition.match(/filename="([^"]+)"/i)?.[1]
    let filename = plain || '评审凭证'
    if (encoded) {
      try {
        filename = decodeURIComponent(encoded)
      } catch {
        /* Keep the safe fallback. */
      }
    }
    return { blob: response.data, filename: filename.replace(/[\\/\x00-\x1f]/g, '_') }
  },
  async downloadRuleEvidence(ref: string) {
    const response = await http.get<Blob>(
      `${root}/rules/evidence/${encodeURIComponent(ref)}/download`,
      { responseType: 'blob' },
    )
    const disposition = String(response.headers?.['content-disposition'] || '')
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    let filename = disposition.match(/filename="([^"]+)"/i)?.[1] || '规则凭证'
    if (encoded) {
      try {
        filename = decodeURIComponent(encoded)
      } catch {
        /* Use the fallback name. */
      }
    }
    return { blob: response.data, filename: filename.replace(/[\\/\x00-\x1f]/g, '_') }
  },
  async export(q: Query) {
    const { page: _page, size: _size, ...filters } = q
    return (
      await http.get<Blob>(`${root}/export`, {
        params: { ...filters, format: 'csv' },
        responseType: 'blob',
      })
    ).data
  },
}
export function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
