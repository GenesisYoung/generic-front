import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({
  list: vi.fn(),
  purchasers: vi.fn(),
  assign: vi.fn(),
  complete: vi.fn(),
}))
const perms = vi.hoisted(() => new Set<string>())
vi.mock('@/features/placement-task/api', () => ({ placementApi: api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: (c: string) => perms.has(c) }) }))
import Page from '@/views/virtulization/purchase/PlacementTasks.vue'
import {
  deadlineColor,
  deadlineLabel,
  doneLabel,
  lineCoverage,
  sourceLabel,
  validPoNo,
  type PlacementTask,
} from '@/features/placement-task/model'
import { lan } from '@/lang'

const wrapperStub = defineComponent({ template: '<div><slot /></div>' })
const buttonStub = defineComponent({
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})
const inputStub = defineComponent({
  props: { modelValue: { type: [String, Number], default: '' } },
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const stubs: Record<string, Component> = {
  VBtn: buttonStub,
  VTab: buttonStub,
  VTextField: inputStub,
}
for (const name of [
  'VContainer',
  'VAlert',
  'VTable',
  'VChip',
  'VSpacer',
  'VBtnToggle',
  'VPagination',
  'VDialog',
  'VCard',
  'VCardTitle',
  'VCardText',
  'VCardActions',
  'VSelect',
  'VTabs',
])
  stubs[name] = wrapperStub

function task(id: number, extra: Partial<PlacementTask> = {}): PlacementTask {
  return {
    id,
    orderNo: `P-${id}`,
    orderType: 'PRODUCTION',
    source: 'PURCHASE_PLAN',
    sourceNo: `PL-${id}`,
    customerName: 'Acme',
    auditRound: null,
    auditVerifiedAt: null,
    startedAt: '2026-11-20T08:30:00',
    deadlineAt: '2026-11-22T08:30:00',
    hoursLeft: 29,
    status: 'OPEN',
    assigneeId: null,
    assigneeName: null,
    assignedAt: null,
    doneAt: null,
    doneSource: null,
    donePoNo: null,
    linkedPoNos: [],
    linesWithPo: 0,
    lineCount: 3,
    ...extra,
  }
}

function pageOf(
  content: PlacementTask[],
  canAssign = false,
  openCounts = { PRODUCTION: 0, SAMPLE: 0 },
) {
  return { content, totalElements: content.length, totalPages: 1, page: 0, canAssign, openCounts }
}

afterEach(() => {
  vi.clearAllMocks()
  perms.clear()
})

describe('placement task model', () => {
  it('describes the deadline in days and hours', () => {
    expect(deadlineLabel(task(1, { hoursLeft: 29 }))).toBe('剩余 1 天 5 小时')
    expect(deadlineLabel(task(1, { hoursLeft: 5 }))).toBe('剩余 5 小时')
    expect(deadlineLabel(task(1, { hoursLeft: -3 }))).toBe('已超期 3 小时')
    expect(deadlineLabel(task(1, { status: 'DONE' }))).toBe(lan.placementDone)
  })

  it('colours overdue, due soon and done tasks', () => {
    expect(deadlineColor(task(1, { hoursLeft: -1 }))).toBe('error')
    expect(deadlineColor(task(1, { hoursLeft: 12 }))).toBe('warning')
    expect(deadlineColor(task(1, { hoursLeft: 30 }))).toBe('info')
    expect(deadlineColor(task(1, { status: 'DONE' }))).toBe('success')
  })

  it('shows line coverage and how a task was closed', () => {
    expect(lineCoverage(task(1, { linesWithPo: 2, lineCount: 3 }))).toBe('2/3')
    expect(lineCoverage(task(1, { linesWithPo: 2, lineCount: null }))).toBe('2')
    expect(doneLabel(task(1, { status: 'DONE', doneSource: 'LINKED_PO', donePoNo: 'PO-1' }))).toBe(
      '关联采购单 PO-1',
    )
    expect(doneLabel(task(1, { status: 'DONE', doneSource: 'MANUAL', donePoNo: 'PO-2' }))).toBe(
      '手工填写 PO-2',
    )
    expect(doneLabel(task(1, { status: 'DONE', doneSource: 'CONFIRMED' }))).toBe(
      '旧 ERP 已采购确认',
    )
  })

  it('names the source document', () => {
    expect(sourceLabel(task(1))).toBe('采购计划 PL-1')
    expect(sourceLabel(task(1, { source: 'PURCHASE_APPLICATION', sourceNo: 'RQ-1' }))).toBe(
      '采购申请 RQ-1',
    )
    expect(sourceLabel(task(1, { source: 'ORDER_AUDIT', sourceNo: null }))).toBe('订单评审')
  })

  it('accepts PO numbers of 1 to 50 characters', () => {
    expect(validPoNo(' PO-1 ')).toBe(true)
    expect(validPoNo('   ')).toBe(false)
    expect(validPoNo('x'.repeat(51))).toBe(false)
  })
})

describe('PlacementTasks page', () => {
  it('lists open tasks; a purchaser can complete but not assign', async () => {
    perms.add('menu.purchaseOrder.update')
    api.list.mockResolvedValue(pageOf([task(1)]))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(api.list).toHaveBeenCalledWith('PRODUCTION', true, 0, 20)
    const row = page.find('[data-test="row"]')
    expect(row.text()).toContain('P-1')
    expect(row.find('[data-test="source"]').text()).toBe('采购计划 PL-1')
    expect(row.find('[data-test="lines"]').text()).toBe('0/3')
    expect(row.find('[data-test="assignee"]').text()).toBe(lan.placementUnassigned)
    expect(page.find('[data-test="assign"]').exists()).toBe(false)
    expect(page.find('[data-test="complete"]').exists()).toBe(true)
  })

  it('lets a department member assign a colleague', async () => {
    perms.add('menu.purchaseOrder.update')
    api.list.mockResolvedValue(pageOf([task(1)], true))
    api.purchasers.mockResolvedValue([{ id: 7, name: '王采购' }])
    api.assign.mockResolvedValue(task(1, { assigneeId: 7, assigneeName: '王采购' }))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="assign"]').trigger('click')
    await flushPromises()
    expect(api.purchasers).toHaveBeenCalled()

    await page.find('[data-test="save"]').trigger('click')
    expect(page.find('[data-test="dialog-error"]').text()).toBe(lan.placementChoosePurchaser)
    expect(api.assign).not.toHaveBeenCalled()
  })

  it('completes a task by hand and shows the backend message on failure', async () => {
    perms.add('menu.purchaseOrder.update')
    api.list.mockResolvedValue(pageOf([task(1)]))
    api.complete.mockRejectedValueOnce(new Error('该下单任务已完成或已跳过'))
    api.complete.mockResolvedValueOnce(task(1, { status: 'DONE' }))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="complete"]').trigger('click')

    await page.find('[data-test="save"]').trigger('click')
    expect(page.find('[data-test="dialog-error"]').text()).toBe(lan.placementPoNoInvalid)

    await page.find('[data-test="po-no"]').setValue(' PO-9 ')
    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.complete).toHaveBeenCalledWith(1, 'PO-9')
    expect(page.find('[data-test="dialog-error"]').text()).toBe('该下单任务已完成或已跳过')

    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="notice"]').text()).toBe(lan.placementCompleted)
    expect(api.list).toHaveBeenCalledTimes(2)
  })

  it('keeps sample orders in their own section', async () => {
    api.list.mockResolvedValueOnce(pageOf([task(1)], false, { PRODUCTION: 1, SAMPLE: 2 }))
    api.list.mockResolvedValueOnce(
      pageOf(
        [task(2, { orderNo: 'YP-2', orderType: 'SAMPLE', source: 'PURCHASE_APPLICATION' })],
        false,
        { PRODUCTION: 1, SAMPLE: 2 },
      ),
    )
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="count-SAMPLE"]').text()).toBe('2')

    await page.find('[data-test="section-SAMPLE"]').trigger('click')
    await flushPromises()
    expect(api.list).toHaveBeenLastCalledWith('SAMPLE', true, 0, 20)
    expect(page.find('[data-test="row"]').text()).toContain('YP-2')
    expect(page.find('[data-test="row"]').text()).not.toContain('P-1')
  })

  it('shows nothing to do when the user may not update', async () => {
    api.list.mockResolvedValue(pageOf([task(1)], true))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="assign"]').exists()).toBe(false)
    expect(page.find('[data-test="complete"]').exists()).toBe(false)
  })
})
