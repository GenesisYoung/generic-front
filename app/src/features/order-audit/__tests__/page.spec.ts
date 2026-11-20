import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
const api = vi.hoisted(() => ({
  metadata: vi.fn(),
  list: vi.fn(),
  detail: vi.fn(),
  save: vi.fn(),
  act: vi.fn(),
}))
vi.mock('@/features/order-audit/api', () => ({ auditApi: api, uploadAuditEvidence: vi.fn() }))
import Page from '@/views/virtulization/pmc/OrderAuditTask.vue'
const wrapperStub = defineComponent({ template: '<div><slot /></div>' })
const dialogStub = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
})
const buttonStub = defineComponent({
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})
const stubs: Record<string, unknown> = {}
for (const name of [
  'VContainer',
  'VRow',
  'VCol',
  'VCard',
  'VCardText',
  'VCardActions',
  'VAlert',
  'VTable',
  'VChip',
  'VSpacer',
  'VSelect',
  'VTextField',
  'VTextArea',
  'VProgressLinear',
  'VPagination',
])
  stubs[name] = wrapperStub
stubs.VDialog = dialogStub
stubs.VSnackbar = dialogStub
stubs.VBtn = buttonStub
const metadata = {
  users: [],
  canCreate: true,
  timezone: 'Asia/Shanghai',
  acceptanceRule: '已批准资料清单',
  completionRule: '合格成果交付',
}
let page: VueWrapper
beforeEach(() => {
  vi.resetAllMocks()
  api.metadata.mockResolvedValue(metadata)
  api.list.mockResolvedValue({
    items: [],
    total: 0,
    sourceChecked: false,
    asOf: new Date().toISOString(),
  })
})
afterEach(() => page?.unmount())
function open() {
  page = mount(Page, { global: { stubs: stubs as never } })
  return page
}
function button(text: string) {
  return page.findAll('button').find((b) => b.text() === text)!
}

describe('normal business page', () => {
  it('loads authorized metadata and task data immediately without an activation or demonstration step', async () => {
    open()
    await flushPromises()
    expect(api.metadata).toHaveBeenCalledTimes(1)
    expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 20 }))
    expect(page.text()).not.toMatch(/演示|真实接口尚未启用|等待接口接入/)
    expect(button('新增评审').attributes('disabled')).toBeUndefined()
    expect(page.text()).toContain('来源尚未核对')
  })
  it('disables business writes after initialization failure and lets the user retry the real service', async () => {
    api.metadata.mockRejectedValueOnce(new Error('服务暂时不可用'))
    open()
    await flushPromises()
    expect(api.list).not.toHaveBeenCalled()
    expect(page.text()).toContain('服务暂时不可用')
    expect(button('新增评审').attributes('disabled')).toBeDefined()
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.metadata).toHaveBeenCalledTimes(2)
    expect(api.list).toHaveBeenCalledTimes(1)
    expect(button('新增评审').attributes('disabled')).toBeUndefined()
  })
  it('preserves the server creation permission and unapproved-rule state', async () => {
    api.metadata.mockResolvedValue({ ...metadata, canCreate: false, acceptanceRule: null })
    open()
    await flushPromises()
    expect(button('新增评审').attributes('disabled')).toBeDefined()
    expect(page.text()).toContain('评审业务规则尚未批准')
  })
})
