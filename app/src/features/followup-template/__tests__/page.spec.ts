import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  makeDefault: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/features/followup-template/api', () => ({ templateApi: api }))
const perms = vi.hoisted(() => new Set<string>())
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: (c: string) => perms.has(c) }) }))
import Page from '@/views/virtulization/purchase/FollowUpTemplates.vue'
import type { FollowUpTemplate } from '@/features/followup-template/model'

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
])
  stubs[name] = wrapperStub
stubs.VDialog = dialogStub
stubs.VBtn = buttonStub
stubs.VTextField = inputStub

function tpl(id: number, name: string, extra: Partial<FollowUpTemplate> = {}): FollowUpTemplate {
  return {
    id,
    name,
    materialNote: null,
    productionDays: 30,
    notifyDays: [3, 10, 20],
    overduePeriodDays: 1,
    isDefault: false,
    dayBased: true,
    stages: [],
    activeOrders: 2,
    ...extra,
  }
}

afterEach(() => {
  vi.clearAllMocks()
  perms.clear()
})

describe('FollowUpTemplates page', () => {
  it('lists templates read-only without the update permission', async () => {
    api.list.mockResolvedValue([tpl(1, '默认', { isDefault: true }), tpl(2, '铸件')])
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.findAll('[data-test="row"]')).toHaveLength(2)
    expect(page.find('[data-test="default"]').exists()).toBe(true)
    expect(page.findAll('[data-test="days"]')[1]!.text()).toBe('3 次：第 3, 10, 20 天')
    expect(page.find('[data-test="new"]').exists()).toBe(false)
    expect(page.find('[data-test="edit"]').exists()).toBe(false)
  })

  it('creates a template from chosen days and shows a preview', async () => {
    perms.add('menu.followupTemplate.update')
    api.list.mockResolvedValue([])
    api.create.mockResolvedValue(tpl(3, '电子料'))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="new"]').trigger('click')
    await page.find('[data-test="name"]').setValue('电子料')
    await page.find('[data-test="day-5"]').trigger('click')
    await page.find('[data-test="day-15"]').trigger('click')
    expect(page.findAll('[data-test="preview"]').map((p) => p.text())).toEqual([
      expect.stringContaining('任务 1：第 5-14 天'),
      expect.stringContaining('任务 2：第 15-30 天'),
    ])
    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '电子料', productionDays: 30, notifyDays: [5, 15] }),
    )
    expect(page.find('[data-test="notice"]').text()).toContain('模板“电子料”已保存')
  })

  it('fills days every N days and refuses a template without days', async () => {
    perms.add('menu.followupTemplate.update')
    api.list.mockResolvedValue([])
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="new"]').trigger('click')
    await page.find('[data-test="name"]').setValue('A')
    await page.find('[data-test="save"]').trigger('click')
    expect(api.create).not.toHaveBeenCalled()
    expect(page.find('[data-test="dialog-error"]').text()).toContain('请选择 1 到 60 个通知日')
    await page.find('[data-test="fill"]').trigger('click')
    expect(page.find('[data-test="chosen"]').text()).toContain('已选 4 天')
  })

  it('edits, makes default and removes after confirming', async () => {
    perms.add('menu.followupTemplate.update')
    const castings = tpl(2, '铸件')
    api.list.mockResolvedValue([tpl(1, '默认', { isDefault: true }), castings])
    api.update.mockResolvedValue(castings)
    api.makeDefault.mockResolvedValue([tpl(2, '铸件', { isDefault: true }), tpl(1, '默认')])
    api.remove.mockResolvedValue([tpl(2, '铸件', { isDefault: true })])
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    // The default has no remove or make-default buttons.
    expect(page.findAll('[data-test="remove"]')).toHaveLength(1)

    await page.findAll('[data-test="edit"]')[1]!.trigger('click')
    await page.find('[data-test="day-10"]').trigger('click') // remove day 10
    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.update).toHaveBeenCalledWith(2, expect.objectContaining({ notifyDays: [3, 20] }))

    await page.find('[data-test="make-default"]').trigger('click')
    await flushPromises()
    expect(api.makeDefault).toHaveBeenCalledWith(2)
    expect(page.find('[data-test="notice"]').text()).toContain('“铸件”现在是默认模板')

    await page.find('[data-test="remove"]').trigger('click')
    expect(page.find('[data-test="remove-dialog"]').text()).toContain('删除模板“默认”？')
    await page.find('[data-test="confirm-remove"]').trigger('click')
    await flushPromises()
    expect(api.remove).toHaveBeenCalledWith(1)
    expect(page.findAll('[data-test="row"]')).toHaveLength(1)
  })

  it('shows the backend message when saving fails', async () => {
    perms.add('menu.followupTemplate.update')
    api.list.mockResolvedValue([tpl(2, '铸件')])
    api.update.mockRejectedValue(new Error('跟进模板不存在或已删除'))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="edit"]').trigger('click')
    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="dialog-error"]').text()).toContain('跟进模板不存在或已删除')
  })
})
