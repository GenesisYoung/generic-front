// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
import { auditApi, auditWorkflowApi } from '../api'
import { emptyDraft } from '../model'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})
describe('normal business API', () => {
  it('uses real endpoints even when the retired opt-in variable is false', async () => {
    vi.stubEnv('VITE_ORDER_AUDIT_API_ENABLED', 'false')
    http.get.mockResolvedValue({ data: { users: [], canCreate: false } })
    await auditApi.metadata()
    expect(http.get).toHaveBeenCalledWith('/pmc/order-audit-tasks/metadata')
  })
  it('passes a failed request back to the page without supplying replacement records', async () => {
    const error = new Error('service unavailable')
    http.get.mockRejectedValueOnce(error)
    await expect(
      auditApi.list({
        keyword: '',
        ownerUserId: null,
        status: null,
        dueFrom: '',
        dueTo: '',
        timing: null,
        page: 1,
        size: 20,
      }),
    ).rejects.toBe(error)
  })
  it('sends create and edit requests with the required idempotency and version fields', async () => {
    http.post.mockResolvedValue({ data: { id: 'saved' } })
    http.put.mockResolvedValue({ data: { id: 'saved' } })
    const draft = { ...emptyDraft(), orderNumber: 'ORD-1' }
    await auditApi.save(draft)
    expect(http.post).toHaveBeenCalledWith('/pmc/order-audit-tasks', draft, {
      headers: { 'Idempotency-Key': expect.any(String) },
    })
    await auditApi.save(draft, 'task/1', 4)
    expect(http.put).toHaveBeenCalledWith(
      '/pmc/order-audit-tasks/task%2F1',
      { ...draft, lockVersion: 4 },
      { headers: { 'Idempotency-Key': expect.any(String) } },
    )
  })
  it('uses separate business confirmation and approval endpoints with both concurrency versions', async () => {
    http.post.mockResolvedValue({ data: { id: 't1' } })
    const confirm = {
      lockVersion: 5,
      submissionVersion: 2,
      decision: 'APPROVED' as const,
      reason: '通过',
      evidenceRef: 'audit:p',
    }
    await auditWorkflowApi.confirm('t/1', confirm)
    expect(http.post).toHaveBeenLastCalledWith(
      '/pmc/order-audit-tasks/t%2F1/business-confirmations',
      confirm,
      { headers: { 'Idempotency-Key': expect.any(String) } },
    )
    const decision = {
      lockVersion: 6,
      requestVersion: 3,
      decision: 'REJECTED' as const,
      reason: '不批准',
      evidenceRef: 'audit:p',
    }
    await auditWorkflowApi.decideChange('t1', 'c/1', decision)
    expect(http.post).toHaveBeenLastCalledWith(
      '/pmc/order-audit-tasks/t1/change-requests/c%2F1/decision',
      decision,
      { headers: { 'Idempotency-Key': expect.any(String) } },
    )
  })
  it('exports all matched tasks without carrying page restrictions', async () => {
    http.get.mockResolvedValue({ data: new Blob(['csv']) })
    await auditWorkflowApi.export({
      keyword: 'ORD',
      ownerUserId: null,
      status: null,
      dueFrom: '',
      dueTo: '',
      timing: null,
      page: 5,
      size: 20,
    })
    expect(http.get).toHaveBeenLastCalledWith('/pmc/order-audit-tasks/export', {
      params: {
        keyword: 'ORD',
        ownerUserId: null,
        status: null,
        dueFrom: '',
        dueTo: '',
        timing: null,
        format: 'csv',
      },
      responseType: 'blob',
    })
  })
  it('downloads through authenticated requests and preserves the supplied file extension', async () => {
    const blob = new Blob(['pdf'])
    http.get.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': "attachment; filename*=UTF-8''%E8%AF%84%E5%AE%A1.pdf" },
    })
    expect(await auditWorkflowApi.download('t1', 'audit:p1')).toEqual({
      blob,
      filename: '评审.pdf',
    })
    expect(http.get).toHaveBeenLastCalledWith(
      '/pmc/order-audit-tasks/t1/evidence/audit%3Ap1/download',
      { responseType: 'blob' },
    )
  })
})
