import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import {
  emptyDraft,
  type Change,
  type Metadata,
  type Rule,
  type RuleState,
  type Task,
} from '../model'
const api = vi.hoisted(() => ({
  rules: vi.fn(),
  saveRule: vi.fn(),
  decideRule: vi.fn(),
  confirm: vi.fn(),
  requestChange: vi.fn(),
  decideChange: vi.fn(),
  snapshot: vi.fn(),
  download: vi.fn(),
  downloadRuleEvidence: vi.fn(),
}))
const saveFile = vi.hoisted(() => vi.fn())
vi.mock('@/features/order-audit/api', () => ({ auditWorkflowApi: api, saveDownload: saveFile }))
import Rules from '@/views/virtulization/pmc/components/OrderAuditRules.vue'
import Workflow from '@/views/virtulization/pmc/components/OrderAuditWorkflow.vue'
const box = defineComponent({
  props: ['title'],
  template: '<section><h2>{{title}}</h2><slot/></section>',
})
const dialog = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot/></div>',
})
const button = defineComponent({
  inheritAttrs: false,
  props: ['loading'],
  template:
    '<button type="button" v-bind="$attrs" :disabled="loading || $attrs.disabled"><slot/></button>',
})
const input = defineComponent({
  props: ['modelValue', 'label', 'readonly', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<label>{{label}}<input :aria-label="label" :value="modelValue" :readonly="readonly" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)"/></label>',
})
const select = defineComponent({
  props: ['modelValue', 'label', 'items', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<label>{{label}}<select :aria-label="label" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="i in items" :key="i.value" :value="i.value">{{i.title}}</option></select></label>',
})
const stubs = {
  VDialog: dialog,
  VCard: box,
  VCardText: box,
  VCardActions: box,
  VAlert: box,
  VProgressLinear: box,
  VSpacer: box,
  VRow: box,
  VCol: box,
  VBtn: button,
  VTextField: input,
  VTextarea: defineComponent({
    props: ['modelValue', 'label', 'disabled'],
    emits: ['update:modelValue'],
    template:
      '<label>{{label}}<textarea :aria-label="label" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)"/></label>',
  }),
  VSelect: select,
  VCheckbox: input,
}
const meta: Metadata = {
  users: [
    { id: '1', name: '员工' },
    { id: '2', name: '主管' },
  ],
  currentUserId: '2',
  canCreate: true,
  canConfigureRules: true,
  canApproveRules: true,
  canExport: true,
  timezone: 'Asia/Shanghai',
  acceptanceRule: '资料齐备',
  completionRule: '主管业务确认通过',
}
const rule: Rule = {
  ruleId: 'default',
  ruleVersion: 1,
  timezone: 'Asia/Shanghai',
  acceptanceRule: '齐备后受理',
  completionNode: 'BUSINESS_APPROVAL',
  requiredMaterials: ['客户订单'],
  reason: '业务批准依据',
  evidenceRef: 'appendix:100',
}
const state: RuleState = {
  version: 2,
  requestedBy: '1',
  approvedBy: null,
  approvedAt: null,
  draft: rule,
  approved: null,
  history: [],
}
function task(): Task {
  return {
    ...emptyDraft(),
    orderNumber: 'ORD-1',
    round: 1,
    title: '交期评审',
    id: 't1',
    taskNumber: 'A1-t1',
    status: 'SUBMITTED',
    lockVersion: 8,
    ownerName: '员工',
    ownerUserId: '1',
    receivedAt: '2026-11-17T08:00:00.123Z',
    acceptedAt: '2026-11-17T09:00:00Z',
    originalDueAt: '2026-11-20T10:00:00Z',
    effectiveDueAt: '2026-11-20T10:00:00Z',
    completedAt: null,
    verificationResult: null,
    nextAction: null,
    nextOwnerUserId: null,
    nextFeedbackAt: null,
    submissions: [
      {
        version: 2,
        conclusion: '评审完成',
        evidenceRef: 'audit:p1',
        completedAt: null,
        reportedCompletedAt: '2026-11-17T10:00:00Z',
        submittedAt: '2026-11-17T10:00:01Z',
        submittedBy: '1',
      },
    ],
    acceptanceRuleSnapshot: rule,
    history: [],
    changeRequests: [],
    allowedActions: ['confirm-business', 'request-change', 'approve-change', 'upload-evidence'],
  }
}
let page: VueWrapper
const btn = (text: string) => page.findAll('button').find((b) => b.text() === text)!
const set = (label: string, value: string) => page.get(`[aria-label="${label}"]`).setValue(value)
function openWorkflow(t = task(), metadata = meta) {
  page = mount(Workflow, { props: { task: t, metadata }, global: { stubs } })
}
async function openRules(metadata = meta) {
  page = mount(Rules, { props: { modelValue: true, metadata }, global: { stubs } })
  await flushPromises()
}
beforeEach(() => {
  vi.resetAllMocks()
  api.rules.mockResolvedValue(structuredClone(state))
  api.confirm.mockResolvedValue(task())
  api.requestChange.mockResolvedValue(task())
  api.decideChange.mockResolvedValue(task())
  api.saveRule.mockResolvedValue(structuredClone(state))
  api.decideRule.mockResolvedValue({ ...state, draft: null, approved: rule })
})
afterEach(() => page?.unmount())
describe('remaining order-review business flows', () => {
  it('submits independent confirmation for the current task and submission versions', async () => {
    openWorkflow()
    await btn('主管业务确认').trigger('click')
    await set('说明及依据 *', '业务确认通过')
    await set('凭证编号 *', 'audit:proof')
    await btn('确认提交').trigger('click')
    await flushPromises()
    expect(api.confirm).toHaveBeenCalledWith('t1', {
      lockVersion: 8,
      submissionVersion: 2,
      decision: 'APPROVED',
      reason: '业务确认通过',
      evidenceRef: 'audit:proof',
    })
    expect(page.emitted('updated')).toHaveLength(1)
  })
  it('keeps a failed mutation form and user input for correction', async () => {
    api.confirm.mockRejectedValue(new Error('凭证无效'))
    openWorkflow()
    await btn('主管业务确认').trigger('click')
    await set('说明及依据 *', '保留说明')
    await set('凭证编号 *', 'invalid')
    await btn('确认提交').trigger('click')
    await flushPromises()
    expect(page.text()).toContain('凭证无效')
    expect((page.get('[aria-label="说明及依据 *"]').element as HTMLInputElement).value).toBe(
      '保留说明',
    )
    expect(page.emitted('updated')).toBeUndefined()
  })
  it('sends deadline requests as proposals without editing task deadline directly', async () => {
    openWorkflow()
    await btn('提出变更申请').trigger('click')
    await set('申请事项', 'DEADLINE')
    await set('申请新截止时间 *', '2026-11-25T10:30')
    await set('说明及依据 *', '客户调整')
    await set('凭证编号 *', 'audit:proof')
    await btn('确认提交').trigger('click')
    await flushPromises()
    expect(api.requestChange).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        lockVersion: 8,
        type: 'DEADLINE',
        affectedSubmissionVersion: 2,
        proposedDueAt: new Date('2026-11-25T10:30').toISOString(),
      }),
    )
    expect(api.confirm).not.toHaveBeenCalled()
  })
  it('hides self-approval while allowing another authorized reviewer to reject', async () => {
    const t = task()
    const c = {
      requestId: 'c1',
      type: 'DEADLINE',
      status: 'PENDING',
      requestedBy: '1',
      requestedAt: '2026-11-17T12:00:00Z',
      reason: '延期',
      evidenceRef: 'audit:p1',
      requestVersion: 3,
      proposedDueAt: '2026-11-25T10:30:00Z',
      originalValues: { effectiveDueAt: t.effectiveDueAt },
    } as Change
    t.changeRequests = [c]
    openWorkflow(t, { ...meta, currentUserId: '1' })
    expect(btn('审批此申请')).toBeUndefined()
    page.unmount()
    openWorkflow(t)
    await btn('审批此申请').trigger('click')
    await set('处理结论', 'REJECTED')
    await set('说明及依据 *', '不同意延期')
    await set('凭证编号 *', 'audit:review')
    await btn('确认提交').trigger('click')
    await flushPromises()
    expect(api.decideChange).toHaveBeenCalledWith('t1', 'c1', {
      lockVersion: 8,
      requestVersion: 3,
      decision: 'REJECTED',
      reason: '不同意延期',
      evidenceRef: 'audit:review',
    })
  })
  it('navigates approved next rounds and retrieves the exact historical snapshot and protected proof', async () => {
    const t = task()
    t.reviewChildTaskId = 't2'
    api.snapshot.mockResolvedValue(t.submissions[0])
    api.download.mockResolvedValue({ blob: new Blob(['proof']), filename: 'proof.txt' })
    openWorkflow(t)
    await btn('进入获批下一轮').trigger('click')
    expect(page.emitted('openTask')?.[0]).toEqual(['t2'])
    await btn('查看第2版快照').trigger('click')
    await flushPromises()
    expect(api.snapshot).toHaveBeenCalledWith('t1', 2)
    expect(page.text()).toContain('评审完成')
    await btn('关闭').trigger('click')
    await btn('下载').trigger('click')
    await flushPromises()
    expect(api.download).toHaveBeenCalledWith('t1', 'audit:p1')
    expect(saveFile).toHaveBeenCalled()
  })
  it('requires an independent rule approver and submits a versioned approval', async () => {
    await openRules({ ...meta, currentUserId: '1' })
    expect(btn('提交规则审批')).toBeUndefined()
    page.unmount()
    await openRules()
    await set('审批说明 *', '批准采用')
    await set('审批凭证编号 *', 'appendix:200')
    await btn('提交规则审批').trigger('click')
    await flushPromises()
    expect(api.decideRule).toHaveBeenCalledWith({
      ruleVersion: 2,
      decision: 'APPROVED',
      reason: '批准采用',
      evidenceRef: 'appendix:200',
    })
    expect(page.emitted('changed')).toHaveLength(1)
  })
  it('saves a rule draft using the current catalogue version and the entered mandatory checklist', async () => {
    await openRules()
    await btn('修改待批准草稿').trigger('click')
    await set('必备资料名称，每行一项 *', '客户订单\n包装规格')
    await btn('保存待批准草稿').trigger('click')
    await flushPromises()
    expect(api.saveRule).toHaveBeenCalledWith(
      expect.objectContaining({ ruleVersion: 2, requiredMaterials: ['客户订单', '包装规格'] }),
    )
    expect(page.text()).toContain('请由另一名授权人员批准')
  })
  it('does not expose mutation controls to a reader without server capabilities', () => {
    const t = task()
    t.allowedActions = []
    openWorkflow(t)
    expect(btn('主管业务确认')).toBeUndefined()
    expect(btn('提出变更申请')).toBeUndefined()
  })
  it('lets an independent rule reviewer download only the linked rule proof through its endpoint', async () => {
    api.rules.mockResolvedValue({
      ...state,
      draft: { ...rule, evidenceRef: 'evidence:p1' },
      evidenceRefs: ['evidence:p1'],
    })
    api.downloadRuleEvidence.mockResolvedValue({ blob: new Blob(['proof']), filename: '规则.txt' })
    await openRules()
    await btn('下载规则凭证').trigger('click')
    await flushPromises()
    expect(api.downloadRuleEvidence).toHaveBeenCalledWith('evidence:p1')
    expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), '规则.txt')
  })
})
