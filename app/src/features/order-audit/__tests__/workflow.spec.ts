// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDemoApi } from './fixtures/demo'
import { emptyDraft, timing, type Query, type Task } from '../model'
const query = (): Query => ({
  keyword: '',
  ownerUserId: null,
  status: null,
  dueFrom: '',
  dueTo: '',
  timing: null,
  page: 1,
  size: 20,
})
async function waiting() {
  const api = createDemoApi()
  return { api, task: await api.detail('101') }
}
function complete(task: Task) {
  task.materials[0]!.status = 1
  task.materials[0]!.actualAt = new Date().toISOString()
  task.materials[0]!.evidenceRef = 'DOC-001'
  return task
}
describe('A1 workflow contract in the explicit demonstration sandbox', () => {
  it('keeps unaccepted tasks outside deadline timing and refuses incomplete acceptance', async () => {
    const { api, task } = await waiting()
    expect(timing(task, new Date().toISOString())).toBe('未受理')
    await expect(
      api.act(task.id, 'accept', {
        lockVersion: 1,
        dueAt: new Date().toISOString(),
        basis: '批准依据',
      }),
    ).rejects.toThrow('受理条件')
    expect((await api.detail(task.id)).acceptedAt).toBeNull()
  })
  it('requires checklist completeness even if every supplied row is submitted', async () => {
    const { api, task } = await waiting()
    complete(task)
    task.checklistConfirmed = false
    const saved = await api.save(task, task.id, task.lockVersion)
    await expect(api.act(saved.id, 'accept', { lockVersion: saved.lockVersion })).rejects.toThrow(
      '受理条件',
    )
  })
  it('freezes the first deadline and refuses direct edits after acceptance', async () => {
    const { api, task } = await waiting()
    const saved = await api.save(complete(task), task.id, task.lockVersion)
    const dueAt = new Date(Date.now() + 86400000).toISOString()
    const accepted = await api.act(saved.id, 'accept', {
      lockVersion: saved.lockVersion,
      dueAt,
      basis: '已批准时限',
    })
    expect(accepted.originalDueAt).toBe(dueAt)
    expect(accepted.effectiveDueAt).toBe(dueAt)
    await expect(api.save(accepted, accepted.id, accepted.lockVersion)).rejects.toThrow(
      '正式受理后',
    )
  })
  it('rejects stale writes and leaves the winning record intact', async () => {
    const { api, task } = await waiting()
    await api.save({ ...task, title: '获胜版本' }, task.id, task.lockVersion)
    await expect(
      api.save({ ...task, title: '旧版本覆盖' }, task.id, task.lockVersion),
    ).rejects.toThrow('更新')
    expect((await api.detail(task.id)).title).toBe('获胜版本')
  })
  it('records blocked follow-up without pausing or moving the deadline', async () => {
    const api = createDemoApi()
    const t = await api.detail('102')
    await expect(
      api.act(t.id, 'block', { lockVersion: t.lockVersion, reason: '缺件' }),
    ).rejects.toThrow('下一动作')
    const blocked = await api.act(t.id, 'block', {
      lockVersion: t.lockVersion,
      reason: '外部资料异常',
      nextAction: '核对资料',
      nextOwnerUserId: 'demo-pmc',
      nextFeedbackAt: new Date().toISOString(),
    })
    expect(blocked.effectiveDueAt).toBe(t.effectiveDueAt)
    expect(timing(blocked, new Date().toISOString())).toBe('逾期未结')
  })
  it('keeps failed verification distinct from unfinished work', async () => {
    const api = createDemoApi()
    const t = await api.detail('104')
    const result = await api.act(t.id, 'verify', {
      lockVersion: t.lockVersion,
      result: 'FAIL',
      reason: '不符合交付要求',
      evidenceRef: 'CHECK-001',
    })
    expect(result.status).toBe('VERIFIED')
    expect(result.verificationResult).toBe('FAIL')
    expect(timing(result, new Date().toISOString())).toBe('逾期已交付')
  })
  it('preserves first submission on proof return and creates a second version', async () => {
    const api = createDemoApi()
    const t = await api.detail('104')
    const returned = await api.act(t.id, 'verify', {
      lockVersion: t.lockVersion,
      result: 'NEED_PROOF',
      reason: '补凭证',
      evidenceRef: 'CHECK-001',
    })
    const result = await api.act(t.id, 'submit', {
      lockVersion: returned.lockVersion,
      conclusion: '已补齐',
      evidenceRef: 'REVIEW-002',
      completedAt: new Date().toISOString(),
    })
    expect(result.submissions.map((s) => s.version)).toEqual([1, 2])
    expect(result.submissions[0]).toEqual(t.submissions[0])
    expect(result.verificationResult).toBeNull()
  })
  it('leaves disputes submitted instead of silently passing them', async () => {
    const api = createDemoApi()
    const t = await api.detail('104')
    const result = await api.act(t.id, 'verify', {
      lockVersion: t.lockVersion,
      result: 'DISPUTED',
      reason: '归责争议',
      evidenceRef: 'CHECK-001',
    })
    expect(result.status).toBe('SUBMITTED')
    expect(result.verificationResult).toBe('DISPUTED')
  })
  it('enforces composite uniqueness and filters/paginates on the whole result', async () => {
    const api = createDemoApi()
    await expect(api.save({ ...emptyDraft(), orderNumber: '演示订单-101' })).rejects.toThrow('重复')
    expect((await api.list({ ...query(), status: 'SUBMITTED' })).total).toBe(1)
    const result = await api.list({ ...query(), size: 2, page: 2 })
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(5)
    expect(
      (
        await api.list({ ...query(), dueFrom: new Date(Date.now() - 3600000).toISOString() })
      ).items.some((t) => t.id === '101'),
    ).toBe(false)
  })
  it('does not share data between demonstration sessions', async () => {
    const api = createDemoApi()
    await api.save({ ...emptyDraft(), orderNumber: '独立演示' })
    expect((await api.list(query())).total).toBe(6)
    expect((await createDemoApi().list(query())).total).toBe(5)
  })
})
