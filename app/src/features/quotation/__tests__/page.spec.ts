import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({
  status: vi.fn(),
  orders: vi.fn(),
  plan: vi.fn(),
  exportExcel: vi.fn(),
  settings: vi.fn(),
  saveSettings: vi.fn(),
}))
vi.mock('@/features/quotation/api', () => ({ quotationApi: api }))
const perms = vi.hoisted(() => new Set<string>())
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: (c: string) => perms.has(c) }) }))
const push = vi.hoisted(() => vi.fn())
const query = vi.hoisted(() => ({ orderNo: '26394-W53' }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), useRoute: () => ({ query }) }))
import ListPage from '@/views/virtulization/purchase/QuotationList.vue'
import PlanPage from '@/views/virtulization/purchase/QuotationPlan.vue'
import type { OrderSummary, QuotationPlan } from '@/features/quotation/model'

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
const toggleStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
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
  'VProgressLinear',
  'VCheckboxBtn',
])
  stubs[name] = wrapperStub
stubs.VDialog = dialogStub
stubs.VBtn = buttonStub
stubs.VBtnToggle = toggleStub
stubs.VTextField = inputStub
stubs.VSelect = inputStub

function order(no: string, bomStatus: OrderSummary['bomStatus']): OrderSummary {
  return {
    orderNo: no,
    customerCode: 'C1',
    customerName: '客户',
    orderDate: '2026-11-16',
    deliveryDate: null,
    planNo: no,
    planDate: '2026-11-20',
    lineCount: 1,
    totalQty: 100,
    hasProductBom: bomStatus !== 'NONE',
    hasPackagingBom: bomStatus === 'BOTH',
    bomStatus,
    planLines: 4,
    planLinesBought: no.endsWith('2') ? 1 : 0,
  }
}

function plan(): QuotationPlan {
  const supplier = (code: string, p: number) => ({
    supplierCode: code,
    supplierName: `${code} 公司`,
    price: p,
    taxRate: null,
    currency: 'RMB',
    validFrom: null,
    validTo: null,
  })
  return {
    order: order('26394-W53', 'BOTH'),
    lines: [],
    productItems: [
      {
        kind: 'PRODUCT',
        bomCode: 'B1',
        productCode: 'P1',
        lineNo: 1,
        level: 1,
        materialCode: 'A',
        materialName: '灯珠',
        spec: null,
        unit: 'PCS',
        materialClass: '111',
        qtyPerUnit: 2,
        orderQty: 100,
        totalQty: 200,
        suppliers: [supplier('S1', 1.5), supplier('S2', 1.8)],
        selectedSupplierCode: 'S1',
        selectedSupplierName: 'S1 公司',
        unitPrice: 1.5,
        amount: 300,
        cheapestPrice: 1.5,
        basePrice: 1,
        priceCheck: 'HIGH',
      },
    ],
    packagingItems: [],
    productMaterialCost: 300,
    packagingMaterialCost: 0,
    materialCost: 300,
    fees: [
      { code: 'MANAGEMENT', base: 'MATERIAL', ratePercent: 15, baseAmount: 300, amount: 45 },
      { code: 'TAX', base: 'PRICE', ratePercent: 6, baseAmount: 396.75, amount: 23.81 },
    ],
    costBeforeProfit: 345,
    marginRate: 15,
    marginTierMin: 0,
    marginOverridden: false,
    profit: 51.75,
    totalPrice: 420.56,
    unitPrice: 4.2056,
    currency: 'RMB',
    missingPriceCount: 0,
    priceWarningCount: 1,
    warnings: ['有 1 行物料单价与上次采购价相差 20% 或以上'],
    generatedAt: null,
  }
}

afterEach(() => {
  vi.clearAllMocks()
  perms.clear()
})

describe('Quotations list page', () => {
  it('shows BOM status, counts and opens a quotation', async () => {
    api.status.mockResolvedValue({ available: true })
    api.orders.mockResolvedValue([
      order('A-1', 'BOTH'),
      order('B-2', 'NONE'),
      order('C-3', 'PRODUCT_ONLY'),
    ])
    const page = mount(ListPage, { global: { stubs } })
    await flushPromises()
    expect(page.findAll('[data-test="order-row"]')).toHaveLength(3)
    expect(page.find('[data-test="filter-without"]').text()).toBe('无BOM（1）')
    const statuses = page.findAll('[data-test="bom-status"]').map((c) => c.text())
    expect(statuses).toEqual(['产品BOM + 包装BOM', '无BOM', '仅产品BOM'])
    expect(page.findAll('[data-test="quote"]')[1]!.attributes('disabled')).toBeDefined()
    await page.findAll('[data-test="quote"]')[0]!.trigger('click')
    expect(push).toHaveBeenCalledWith({
      path: '/purchase/quotations/plan',
      query: { orderNo: 'A-1' },
    })
  })

  it('says when the old ERP is not connected', async () => {
    api.status.mockResolvedValue({ available: false })
    const page = mount(ListPage, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="off"]').exists()).toBe(true)
    expect(api.orders).not.toHaveBeenCalled()
  })

  it('saves the rates with the update permission', async () => {
    perms.add('menu.quotation.update')
    api.status.mockResolvedValue({ available: true })
    api.orders.mockResolvedValue([])
    const s = {
      fees: [{ code: 'TAX', base: 'PRICE', ratePercent: 6, enabled: true }],
      marginTiers: [{ minAmount: 0, ratePercent: 15 }],
      priceCheckLow: 0.8,
      priceCheckHigh: 1.2,
    }
    api.settings.mockResolvedValue(s)
    api.saveSettings.mockResolvedValue(s)
    const page = mount(ListPage, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="settings"]').trigger('click')
    await flushPromises()
    expect(page.findAll('[data-test="fee-row"]')).toHaveLength(1)
    await page.find('[data-test="save-settings"]').trigger('click')
    await flushPromises()
    expect(api.saveSettings).toHaveBeenCalled()
    expect(page.find('[data-test="notice"]').text()).toBe('报价费率已保存')
  })
})

describe('Quotation plan page', () => {
  it('shows the plan, recalculates with another supplier and exports', async () => {
    api.plan.mockResolvedValue(plan())
    api.exportExcel.mockResolvedValue('报价方案_26394-W53.xlsx')
    const page = mount(PlanPage, { global: { stubs } })
    await flushPromises()
    expect(api.plan).toHaveBeenCalledWith('26394-W53', {
      selections: {},
      fees: null,
      marginRate: null,
    })
    expect(page.find('[data-test="total"]').text()).toBe('420.56')
    expect(page.find('[data-test="warnings"]').text()).toContain('20%')
    expect(page.findAll('[data-test="fee-row"]')).toHaveLength(2)

    await page.find('[data-test="supplier-A"]').setValue('S2')
    await flushPromises()
    expect(api.plan).toHaveBeenLastCalledWith(
      '26394-W53',
      expect.objectContaining({ selections: { A: 'S2' } }),
    )

    await page.find('[data-test="rate-MANAGEMENT"]').setValue('12')
    await page.find('[data-test="apply-rates"]').trigger('click')
    await flushPromises()
    const req = api.plan.mock.lastCall![1]
    expect(req.fees).toContainEqual({
      code: 'MANAGEMENT',
      base: 'MATERIAL',
      ratePercent: 12,
      enabled: true,
    })
    expect(req.marginRate).toBeNull()

    await page.find('[data-test="export"]').trigger('click')
    await flushPromises()
    expect(api.exportExcel).toHaveBeenCalledWith(
      '26394-W53',
      expect.objectContaining({ selections: { A: 'S2' } }),
    )
    expect(page.find('[data-test="notice"]').text()).toContain('报价方案_26394-W53.xlsx')
  })

  it('refuses an invalid rate before calling the server', async () => {
    api.plan.mockResolvedValue(plan())
    const page = mount(PlanPage, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="rate-TAX"]').setValue('150')
    await page.find('[data-test="apply-rates"]').trigger('click')
    expect(page.find('[data-test="error"]').text()).toContain('100%')
    expect(api.plan).toHaveBeenCalledTimes(1)
  })
})
