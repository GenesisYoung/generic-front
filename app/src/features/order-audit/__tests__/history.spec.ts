// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { historyActionLabel, historyNote } from '../history'
const format = { date: (v: string) => `时间(${v})`, person: (v: string) => `人员(${v})` }
function show(action: string, note: string) {
  return historyNote({ at: '', actor: '', action, note }, format)
}
describe('readable order-review audit history', () => {
  it('explains the exact all-null request in the reported screenshot', () => {
    const text = show(
      'check-data',
      JSON.stringify({
        lockVersion: 2,
        dueAt: null,
        basis: null,
        reason: null,
        evidenceRef: null,
        nextAction: null,
        nextOwnerUserId: null,
        nextFeedbackAt: null,
        conclusion: null,
        completedAt: null,
        result: null,
      }),
    )
    expect(text).toBe('已提交资料检查，等待资料补齐或主管正式受理。')
    expect(text).not.toMatch(/lockVersion|null|\{|\}/)
  })
  it('shows useful business details with readable labels, times and people', () => {
    const text = show(
      'block',
      JSON.stringify({
        lockVersion: 8,
        reason: '客户资料待确认',
        nextAction: '补充规格',
        nextOwnerUserId: '321',
        nextFeedbackAt: '2026-11-20T08:00:00Z',
      }),
    )
    expect(text).toContain('说明：客户资料待确认')
    expect(text).toContain('协作人：人员(321)')
    expect(text).toContain('下一反馈时间：时间(2026-11-20T08:00:00Z)')
    expect(text).not.toContain('lockVersion')
  })
  it('translates outcomes and the old array confirmation format', () => {
    expect(show('verify', '{"result":"FAIL","reason":"依据不足"}')).toContain('核验结果：不符合')
    expect(show('business-APPROVED', '[1,"APPROVED","业务通过","audit:proof",12]')).toBe(
      '成果版本：第1版\n处理结论：通过\n说明：业务通过\n凭证编号：audit:proof',
    )
  })
  it('keeps the new review task reference without exposing internal request snapshots', () => {
    const text = show(
      'change-APPROVED',
      '{"type":"REVIEW_AGAIN","requestVersion":2,"proposedChanges":{"ownerUserId":"321"}}；新任务：A1-new',
    )
    expect(text).toBe('变更事项：新轮次重评\n新任务：A1-new')
  })
  it('preserves existing plain descriptions and hides malformed structured snapshots', () => {
    expect(show('create', '建立手工来源草稿')).toBe('建立手工来源草稿')
    expect(show('submit', '{"conclusion":')).toBe('已记录本次操作，详细信息暂无法显示。')
  })
  it('provides readable names for previously untranslated actions', () => {
    expect(historyActionLabel('change-request')).toBe('提出变更申请')
    expect(historyActionLabel('edit')).toBe('修改评审资料')
    expect(historyActionLabel('unknown-internal-code')).toBe('业务操作')
  })
})
