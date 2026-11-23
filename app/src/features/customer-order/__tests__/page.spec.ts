import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({ list: vi.fn(), syncStatus: vi.fn(), syncNow: vi.fn() }))
const push = vi.hoisted(() => vi.fn())
const perms = vi.hoisted(() => new Set<string>())
vi.mock('@/features/customer-order/api', () => ({ customerOrderApi: api }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: (c: string) => perms.has(c) }) }))
import Page from '@/views/virtulization/pmc/CustomerOrderReview.vue'
import { reviewLabel, type CustomerOrder } from '@/features/customer-order/model'

const wrapperStub = defineComponent({ template: '<div><slot /></div>' })
const buttonStub = defineComponent({
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})
const stubs: Record<string, Component> = { VBtn: buttonStub }
for (const name of [
  'VContainer',
  'VAlert',
  'VTable',
  'VChip',
  'VSpacer',
  'VBtnToggle',
  'VTextField',
  'VPagination',
])
  stubs[name] = wrapperStub

function order(id: number, orderNo: string, extra: Partial<CustomerOrder> = {}): CustomerOrder {
  return {
    id,
    orderNo,
    customerCode: 'C1',
    customerName: 'Acme',
    orderDate: '2026-11-18',
    deliveryDate: '2026-12-20',
    salesCode: 'S01',
    lineCount: 3,
    totalQty: 120,
    legacyAudited: false,
    legacyClosed: false,
    firstSeenAt: '2026-11-20T09:15:00',
    needsReview: true,
    auditTaskId: null,
    auditRound: null,
    auditStatus: null,
    ...extra,
  }
}

function pageOf(content: CustomerOrder[], pendingCount = content.length) {
  return { content, totalElements: content.length, totalPages: 1, page: 0, pendingCount }
}

afterEach(() => {
  vi.clearAllMocks()
  perms.clear()
})

describe('CustomerOrderReview page', () => {
  it('lists orders waiting for an audit and links to the audit page with the number', async () => {
    perms.add('menu.order-audit-task.create')
    api.list.mockResolvedValue(pageOf([order(1, 'SO-1')]))
    api.syncStatus.mockResolvedValue(null)
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(api.list).toHaveBeenCalledWith('pending', 0, 20, '')
    expect(page.find('[data-test="row"]').text()).toContain('SO-1')
    expect(page.find('[data-test="view-pending"]').text()).toBe('待评审（1）')
    await page.find('[data-test="create-audit"]').trigger('click')
    expect(push).toHaveBeenCalledWith({
      path: '/pmc/order-audit-task',
      query: { createFor: 'SO-1' },
    })
  })

  it('hides create and sync without the permissions', async () => {
    api.list.mockResolvedValue(pageOf([order(1, 'SO-1')]))
    api.syncStatus.mockResolvedValue(null)
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="create-audit"]').exists()).toBe(false)
    expect(page.find('[data-test="sync"]').exists()).toBe(false)
  })

  it('shows the backend message when a sync fails', async () => {
    perms.add('menu.customerOrder.update')
    api.list.mockResolvedValue(pageOf([]))
    api.syncStatus.mockResolvedValue(null)
    api.syncNow.mockRejectedValue(new Error('未启用旧 ERP 连接'))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="empty"]').text()).toBe('没有待评审的客户订单')
    await page.find('[data-test="sync"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="error"]').text()).toContain('未启用旧 ERP 连接')
  })

  it('switches to all orders', async () => {
    api.list.mockResolvedValue(pageOf([]))
    api.syncStatus.mockResolvedValue(null)
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="view-all"]').trigger('click')
    expect(api.list).toHaveBeenLastCalledWith('all', 0, 20, '')
  })
})

describe('reviewLabel', () => {
  it('describes the audit state', () => {
    expect(reviewLabel(order(1, 'A'))).toBe('待创建评审')
    expect(reviewLabel(order(1, 'A', { legacyClosed: true, needsReview: false }))).toBe(
      '旧 ERP 已关闭',
    )
    expect(
      reviewLabel(order(1, 'A', { needsReview: false, auditRound: 2, auditStatus: 'VERIFIED' })),
    ).toBe('第2轮 · 已核验')
  })
})
