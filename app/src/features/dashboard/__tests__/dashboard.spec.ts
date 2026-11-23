import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({ pmc: vi.fn(), purchasing: vi.fn() }))
const push = vi.hoisted(() => vi.fn())
vi.mock('@/features/dashboard/api', () => ({ dashboardApi: api }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
import PmcPage from '@/views/virtulization/pmc/PmcDashboard.vue'
import PurchasePage from '@/views/virtulization/purchase/PurchaseDashboard.vue'
import {
  daysLeftLabel,
  percent,
  pmcTiles,
  purchasingTiles,
  type PmcDashboard,
  type PurchasingDashboard,
} from '@/features/dashboard/model'

const wrapperStub = defineComponent({
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})
const stubs: Record<string, Component> = {}
for (const name of [
  'VContainer',
  'VAlert',
  'VTable',
  'VChip',
  'VSpacer',
  'VBtn',
  'VRow',
  'VCol',
  'VCard',
  'VCardTitle',
])
  stubs[name] = wrapperStub

function pmc(): PmcDashboard {
  return {
    generatedAt: '2026-11-20T10:00:00',
    customerOrders: { pendingAudit: 3, newToday: 1, lastSyncAt: null, lastSyncStatus: null },
    audits: { byStatus: { IN_PROGRESS: 2, SUBMITTED: 1 }, overdue: 1, passedLast7Days: 4 },
    placement: {
      open: 5,
      overdue: 2,
      dueSoon: 1,
      unassigned: 1,
      doneLast30Days: 6,
      onTimeRate: 0.8333,
    },
    exceptions: {
      open: 2,
      openBySeverity: { NORMAL: 0, HIGH: 1, URGENT: 1 },
      openByStatus: { REPORTED: 1, ACKNOWLEDGED: 0, IN_PROGRESS: 1 },
      reportedLast7Days: 2,
    },
    overduePlacements: [
      { id: 1, orderNo: 'SO-5', deadlineAt: '2026-11-20T07:00:00', assigneeName: null },
    ],
    urgentExceptions: [],
  }
}

function purchasing(all: boolean): PurchasingDashboard {
  return {
    generatedAt: '2026-11-20T10:00:00',
    allPurchasers: all,
    placement: { open: 2, overdue: 0, dueSoon: 1, unassigned: all ? 1 : 0 },
    followUps: { activeOrders: 4, dueToday: 2, missedLast7Days: 1 },
    exceptions: { open: 1, urgentOpen: 1 },
    byPurchaser: all
      ? [
          {
            purchaserId: 7,
            name: '王采购',
            activeOrders: 4,
            followUpsDueToday: 2,
            missedLast7Days: 1,
            openPlacements: 2,
            overduePlacements: 0,
            openExceptions: 1,
          },
        ]
      : [],
    dueFollowUps: [
      {
        purchaseOrderId: 1,
        poNo: 'PO-W',
        supplierName: 'S',
        stage: 'INITIAL',
        seq: 1,
        windowEnd: '2026-11-21',
        daysLeft: 1,
      },
    ],
    openPlacements: [],
  }
}

afterEach(() => vi.clearAllMocks())

describe('dashboard model', () => {
  it('turns PMC numbers into tiles that point at their pages', () => {
    const tiles = pmcTiles(pmc())
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t]))
    expect(byKey.auditsOpen?.value).toBe('3')
    expect(byKey.placementOverdue?.color).toBe('error')
    expect(byKey.placementOnTime?.value).toBe('83%')
    expect(byKey.pendingAudit?.to).toBe('/pmc/customer-orders')
  })

  it('shows the unassigned tile only to managers', () => {
    expect(purchasingTiles(purchasing(true)).some((t) => t.key === 'placementUnassigned')).toBe(
      true,
    )
    expect(purchasingTiles(purchasing(false)).some((t) => t.key === 'placementUnassigned')).toBe(
      false,
    )
  })

  it('formats rates and days', () => {
    expect(percent(null)).toBe('—')
    expect(daysLeftLabel(0)).toBe('今天截止')
    expect(daysLeftLabel(2)).toBe('还剩 2 天')
    expect(daysLeftLabel(-1)).toBe('已过 1 天')
  })
})

describe('dashboard pages', () => {
  it('PMC dashboard shows tiles and overdue tasks; a tile opens its page', async () => {
    api.pmc.mockResolvedValue(pmc())
    const page = mount(PmcPage, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="tile-pendingAudit"]').text()).toContain('3')
    expect(page.find('[data-test="overdue-row"]').text()).toContain('SO-5')
    await page.find('[data-test="tile-placementOverdue"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/purchase/placements')
  })

  it('PMC dashboard shows the load error', async () => {
    api.pmc.mockRejectedValue(new Error('boom'))
    const page = mount(PmcPage, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="error"]').text()).toBe('无法加载看板：boom')
  })

  it('purchasing dashboard shows the per-purchaser table to managers only', async () => {
    api.purchasing.mockResolvedValue(purchasing(true))
    const manager = mount(PurchasePage, { global: { stubs } })
    await flushPromises()
    expect(manager.find('[data-test="purchaser-row"]').text()).toContain('王采购')

    api.purchasing.mockResolvedValue(purchasing(false))
    const mine = mount(PurchasePage, { global: { stubs } })
    await flushPromises()
    expect(mine.find('[data-test="purchaser-row"]').exists()).toBe(false)
    expect(mine.find('[data-test="followup-row"]').text()).toContain('还剩 1 天')
  })
})
