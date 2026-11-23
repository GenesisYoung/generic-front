import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({ todo: vi.fn(), orderFollowUps: vi.fn(), record: vi.fn() }))
vi.mock('@/features/purchase-followup/api', () => ({ followUpApi: api }))
const perms = vi.hoisted(() => new Set<string>())
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: (c: string) => perms.has(c) }) }))
import Page from '@/views/virtulization/purchase/FollowUpTodo.vue'
import type { TodoItem } from '@/features/purchase-followup/model'

const wrapperStub = defineComponent({ template: '<div><slot /></div>' })
const dialogStub = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
})
const buttonStub = defineComponent({
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})
const selectStub = defineComponent({
  inheritAttrs: false,
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const stubs: Record<string, Component> = {}
for (const name of [
  'VContainer',
  'VCard',
  'VCardTitle',
  'VCardText',
  'VCardActions',
  'VAlert',
  'VTable',
  'VChip',
  'VSpacer',
  'VCheckbox',
  'VProgressLinear',
])
  stubs[name] = wrapperStub
stubs.VDialog = dialogStub
stubs.VSnackbar = dialogStub
stubs.VBtn = buttonStub
stubs.VSelect = selectStub
stubs.VTextField = selectStub
stubs.VTextarea = selectStub

function item(id: number, poNo: string, daysLeft: number): TodoItem {
  return {
    checkpointId: id,
    stage: 'INITIAL',
    seq: 1,
    windowStart: '2026-11-02',
    windowEnd: '2026-11-04',
    daysLeft,
    purchaseOrderId: id * 10,
    poNo,
    supplierCode: 'S1',
    supplierName: 'Supplier',
    orderDate: '2026-11-01',
    expectedDeliveryDate: null,
  }
}

afterEach(() => vi.clearAllMocks())

describe('FollowUpTodo page', () => {
  it('lists my open follow-ups and counts the ones due today', async () => {
    api.todo.mockResolvedValue([item(1, 'PO-A', 0), item(2, 'PO-B', 2)])
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.findAll('[data-test="todo-row"]').map((r) => r.text())).toEqual([
      expect.stringContaining('PO-A'),
      expect.stringContaining('PO-B'),
    ])
    expect(page.find('[data-test="summary"]').text()).toContain('共 2 项待跟进，其中 1 项今天截止')
  })

  it('offers to report an exception on the order when allowed', async () => {
    api.todo.mockResolvedValue([item(1, 'PO-A', 0)])
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="report-exception"]').exists()).toBe(false)

    perms.add('menu.purchaseException.create')
    const allowed = mount(Page, { global: { stubs } })
    await flushPromises()
    await allowed.find('[data-test="report-exception"]').trigger('click')
    expect((allowed.find('[data-test="report-po"]').element as HTMLInputElement).value).toBe('PO-A')
    perms.clear()
  })

  it('shows an empty state', async () => {
    api.todo.mockResolvedValue([])
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="empty"]').exists()).toBe(true)
  })

  it('shows a load error', async () => {
    api.todo.mockRejectedValue(new Error('boom'))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.text()).toContain('加载跟进待办失败：boom')
  })

  it('does not save without a material status', async () => {
    api.todo.mockResolvedValue([item(1, 'PO-A', 0)])
    api.orderFollowUps.mockResolvedValue({ order: {}, checkpoints: [], records: [] })
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="record"]').trigger('click')
    await flushPromises()
    await page.find('[data-test="save"]').trigger('click')
    expect(api.record).not.toHaveBeenCalled()
    expect(page.find('[data-test="dialog-error"]').text()).toContain('请选择物料状态')
  })

  it('saves a follow-up and removes the completed window from the list', async () => {
    api.todo.mockResolvedValue([item(1, 'PO-A', 0), item(2, 'PO-B', 2)])
    api.orderFollowUps.mockResolvedValue({ order: {}, checkpoints: [], records: [] })
    api.record.mockResolvedValue({ record: { id: 9 }, completedCheckpoint: { id: 1 } })
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.findAll('[data-test="record"]')[0]!.trigger('click')
    await flushPromises()
    await page.find('[data-test="material-status"]').setValue('ON_TRACK')
    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.record).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ materialStatus: 'ON_TRACK' }),
    )
    expect(page.findAll('[data-test="todo-row"]')).toHaveLength(1)
    expect(page.text()).toContain('PO-A 跟进已记录，本次检查点已完成')
  })

  it('keeps the dialog open with the backend message when saving fails', async () => {
    api.todo.mockResolvedValue([item(1, 'PO-A', 0)])
    api.orderFollowUps.mockRejectedValue(new Error('history down'))
    api.record.mockRejectedValue(
      new Error('Purchase order PO-A is RECEIVED and needs no follow-up'),
    )
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="record"]').trigger('click')
    await flushPromises()
    await page.find('[data-test="material-status"]').setValue('DELAYED')
    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="dialog-error"]').text()).toContain('needs no follow-up')
    expect(page.findAll('[data-test="todo-row"]')).toHaveLength(1)
  })
})
