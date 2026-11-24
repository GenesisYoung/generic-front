import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), report: vi.fn(), act: vi.fn() }))
vi.mock('@/features/purchase-exception/api', () => ({ exceptionApi: api }))
import Page from '@/views/virtulization/purchase/PurchaseExceptions.vue'
import {
  emptyReportForm,
  label,
  reportFormError,
  type PurchaseException,
} from '@/features/purchase-exception/model'
import { lan } from '@/lang'

const wrapperStub = defineComponent({ template: '<div><slot /></div>' })
const dialogStub = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
})
const buttonStub = defineComponent({
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})
const inputStub = defineComponent({
  inheritAttrs: false,
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const stubs: Record<string, Component> = {
  VBtn: buttonStub,
  VDialog: dialogStub,
  VTextField: inputStub,
  VTextarea: inputStub,
  VSelect: inputStub,
}
for (const name of [
  'VContainer',
  'VAlert',
  'VTable',
  'VChip',
  'VSpacer',
  'VBtnToggle',
  'VPagination',
  'VCard',
  'VCardTitle',
  'VCardText',
  'VCardActions',
])
  stubs[name] = wrapperStub

function exc(id: number, extra: Partial<PurchaseException> = {}): PurchaseException {
  return {
    id,
    exceptionNo: `EX-261120-000${id}`,
    purchaseOrderId: 10,
    poNo: 'PO-1',
    supplierName: '华东五金',
    category: 'DELAY',
    severity: 'URGENT',
    description: '供应商说要晚一周',
    impactDate: '2026-12-05',
    status: 'REPORTED',
    reporterId: 7,
    reporterName: '王采购',
    handlerId: null,
    handlerName: null,
    resolution: null,
    reportedAt: '2026-11-20T10:00:00',
    resolvedAt: null,
    closedAt: null,
    updatedAt: '2026-11-20T10:00:00',
    lockVersion: 1,
    allowedActions: ['ACKNOWLEDGE', 'RESOLVE', 'COMMENT'],
    history: [],
    ...extra,
  }
}

function pageOf(content: PurchaseException[], canReport = true) {
  return { content, totalElements: content.length, totalPages: 1, page: 0, openCount: 1, canReport }
}

afterEach(() => vi.clearAllMocks())

describe('purchase exception model', () => {
  it('checks the report form before sending', () => {
    const f = emptyReportForm()
    expect(reportFormError(f)).toBe('exceptionPoRequired')
    f.poNo = 'PO-1'
    expect(reportFormError(f)).toBe('exceptionCategoryRequired')
    f.category = 'QUALITY'
    expect(reportFormError(f)).toBe('exceptionDescriptionRequired')
    f.description = '划痕'
    f.impactDate = '12/05/2026'
    expect(reportFormError(f)).toBe('exceptionDateFormat')
    f.impactDate = '2026-12-05'
    expect(reportFormError(f)).toBeNull()
    expect(reportFormError(emptyReportForm(10, 'PO-1'))).toBe('exceptionCategoryRequired')
  })

  it('labels come from the lang file', () => {
    expect(label('Category', 'DELAY')).toBe('交期延误')
    expect(label('Status', 'IN_PROGRESS')).toBe('处理中')
    expect(label('Status', 'PENDING_APPROVAL')).toBe('待 PMC 审批')
    expect(label('Approval', 'REJECTED')).toBe('已驳回')
  })
})

describe('PurchaseExceptions page', () => {
  it('lists exceptions and shows only the steps the backend allows', async () => {
    api.list.mockResolvedValue(pageOf([exc(1)]))
    api.detail.mockResolvedValue(
      exc(1, {
        history: [
          {
            action: 'REPORT',
            fromStatus: null,
            toStatus: 'REPORTED',
            operatorId: 7,
            operatorName: '王采购',
            comment: null,
            createdAt: '2026-11-20T10:00:00',
          },
        ],
      }),
    )
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(api.list).toHaveBeenCalledWith('open', 0, 20)
    expect(page.find('[data-test="row"]').text()).toContain('EX-261120-0001')
    expect(page.find('[data-test="status"]').text()).toBe('已上报')

    await page.find('[data-test="row"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="history"]').text()).toContain('王采购 · 上报')
    expect(page.find('[data-test="act-ACKNOWLEDGE"]').exists()).toBe(true)
    expect(page.find('[data-test="act-CLOSE"]').exists()).toBe(false)
  })

  it('asks for the resolution before resolving, then sends it with the version', async () => {
    api.list.mockResolvedValue(pageOf([exc(1)]))
    api.detail.mockResolvedValue(exc(1))
    api.act.mockResolvedValue(exc(1, { status: 'RESOLVED', allowedActions: ['COMMENT'] }))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="row"]').trigger('click')
    await flushPromises()

    await page.find('[data-test="act-RESOLVE"]').trigger('click')
    expect(page.find('[data-test="detail-error"]').text()).toBe(lan.exceptionNeedText_RESOLVE)
    expect(api.act).not.toHaveBeenCalled()

    await page.find('[data-test="comment"]').setValue('改由备选供应商补货')
    await page.find('[data-test="act-RESOLVE"]').trigger('click')
    await flushPromises()
    expect(api.act).toHaveBeenCalledWith(1, 'RESOLVE', '改由备选供应商补货', 1)
    expect(page.find('[data-test="act-RESOLVE"]').exists()).toBe(false)
  })

  it('shows the backend message when an action is refused', async () => {
    api.list.mockResolvedValue(pageOf([exc(1)]))
    api.detail.mockResolvedValue(exc(1))
    api.act.mockRejectedValue(new Error('该异常已被他人更新，请刷新后重试'))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="row"]').trigger('click')
    await flushPromises()
    await page.find('[data-test="act-ACKNOWLEDGE"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="detail-error"]').text()).toBe('该异常已被他人更新，请刷新后重试')
  })

  it('reports an exception from the page', async () => {
    api.list.mockResolvedValue(pageOf([]))
    api.report.mockResolvedValue(exc(2))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="report"]').trigger('click')
    await page.find('[data-test="report-save"]').trigger('click')
    expect(page.find('[data-test="report-error"]').text()).toBe(lan.exceptionPoRequired)

    await page.find('[data-test="report-po"]').setValue('PO-1')
    await page.find('[data-test="report-category"]').setValue('QUALITY')
    await page.find('[data-test="report-description"]').setValue('划痕')
    await page.find('[data-test="report-save"]').trigger('click')
    await flushPromises()
    expect(api.report).toHaveBeenCalledWith(
      expect.objectContaining({ poNo: 'PO-1', category: 'QUALITY', severity: 'NORMAL' }),
    )
    expect(page.find('[data-test="notice"]').text()).toBe('已上报异常 EX-261120-0002')
  })

  it('hides the report button without permission', async () => {
    api.list.mockResolvedValue(pageOf([], false))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="report"]').exists()).toBe(false)
  })

  it('lets a PMC member approve or reject a proposed resolution', async () => {
    const proposal = {
      id: 5,
      status: 'PENDING' as const,
      proposedResolution: '空运补货',
      requestedBy: 20,
      requestedByName: 'PMC 李',
      requestedAt: '2026-11-21T09:00:00',
      decidedBy: null,
      decidedByName: null,
      decidedAt: null,
      decisionComment: null,
    }
    const waiting = exc(1, {
      status: 'PENDING_APPROVAL',
      resolution: '空运补货',
      allowedActions: ['APPROVE', 'REJECT', 'COMMENT'],
      approvals: [proposal],
    })
    api.list.mockResolvedValue({ ...pageOf([waiting]), approvalCount: 1, canApprove: true })
    api.detail.mockResolvedValue(waiting)
    api.act.mockResolvedValue(
      exc(1, {
        status: 'IN_PROGRESS',
        allowedActions: ['COMMENT'],
        approvals: [
          {
            ...proposal,
            status: 'REJECTED',
            decidedBy: 70,
            decidedByName: 'PMC 审批',
            decidedAt: '2026-11-21T10:00:00',
            decisionComment: '成本太高',
          },
        ],
      }),
    )
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="view-approval"]').text()).toBe('待 PMC 审批（1）')
    expect(page.find('[data-test="status"]').text()).toBe('待 PMC 审批')

    await page.find('[data-test="view-approval"]').trigger('click')
    await flushPromises()
    expect(api.list).toHaveBeenLastCalledWith('approval', 0, 20)

    await page.find('[data-test="row"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="pending-approval"]').text()).toContain('空运补货')
    expect(page.find('[data-test="act-APPROVE"]').exists()).toBe(true)

    await page.find('[data-test="act-REJECT"]').trigger('click')
    expect(page.find('[data-test="detail-error"]').text()).toBe(lan.exceptionNeedText_REJECT)
    await page.find('[data-test="comment"]').setValue('成本太高')
    await page.find('[data-test="act-REJECT"]').trigger('click')
    await flushPromises()
    expect(api.act).toHaveBeenCalledWith(1, 'REJECT', '成本太高', 1)
    expect(page.find('[data-test="approval"]').text()).toContain('已驳回')
    expect(page.find('[data-test="approval"]').text()).toContain('成本太高')
  })

  it('hides the approval tab outside the PMC department', async () => {
    api.list.mockResolvedValue(pageOf([exc(1)]))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="view-approval"]').exists()).toBe(false)
  })
})
