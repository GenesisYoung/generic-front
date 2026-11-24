import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
const api = vi.hoisted(() => ({
  overview: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  addType: vi.fn(),
  updateType: vi.fn(),
  apply: vi.fn(),
}))
vi.mock('@/features/followup-plan-group/api', () => ({ planGroupApi: api }))
const tplApi = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/features/followup-template/api', () => ({ templateApi: tplApi }))
const perms = vi.hoisted(() => new Set<string>())
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: (c: string) => perms.has(c) }) }))
import Page from '@/views/virtulization/purchase/FollowUpPlanGroups.vue'
import type { PlanGroupOverview } from '@/features/followup-plan-group/model'

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
  'VSwitch',
  'VAutocomplete',
])
  stubs[name] = wrapperStub
stubs.VDialog = dialogStub
stubs.VBtn = buttonStub
stubs.VTextField = inputStub
stubs.VSelect = inputStub

function data(extra: Partial<PlanGroupOverview> = {}): PlanGroupOverview {
  return {
    groups: [
      {
        id: 1,
        name: '五金',
        separate: true,
        templateId: null,
        templateName: null,
        note: null,
        typeCodes: ['HW', 'SC'],
        openOrders: 4,
      },
    ],
    types: [
      {
        id: 10,
        code: 'HW',
        name: '五金件',
        groupId: 1,
        lineCount: 30,
        lastSeenAt: '2026-11-24T08:00:00',
      },
      { id: 11, code: 'PK', name: '包材', groupId: null, lineCount: 12, lastSeenAt: null },
    ],
    linesSynced: true,
    ...extra,
  }
}

afterEach(() => {
  vi.clearAllMocks()
  perms.clear()
})

describe('FollowUpPlanGroups page', () => {
  it('lists groups and types read-only without the update permission', async () => {
    api.overview.mockResolvedValue(data())
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.findAll('[data-test="group-row"]')).toHaveLength(1)
    expect(page.find('[data-test="mode"]').text()).toBe('单独跟进')
    expect(page.find('[data-test="group-types"]').text()).toContain('SC')
    expect(page.findAll('[data-test="type-row"]')[1]!.text()).toContain('不分组（主任务）')
    expect(page.findAll('[data-test="type-row"]')[1]!.text()).toContain('手动添加')
    expect(page.find('[data-test="ungrouped"]').text()).toBe('（1 个未分组）')
    expect(page.find('[data-test="new"]').exists()).toBe(false)
    expect(page.find('[data-test="apply"]').exists()).toBe(false)
    expect(page.find('[data-test="no-lines"]').exists()).toBe(false)
  })

  it('warns when order lines are not synced', async () => {
    api.overview.mockResolvedValue(data({ linesSynced: false }))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    expect(page.find('[data-test="no-lines"]').exists()).toBe(true)
  })

  it('creates a group, refusing a duplicate name before calling the server', async () => {
    perms.add('menu.followupTemplate.update')
    api.overview.mockResolvedValue(data())
    tplApi.list.mockResolvedValue([])
    api.create.mockResolvedValue(data())
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="new"]').trigger('click')
    await page.find('[data-test="name"]').setValue('五金')
    await page.find('[data-test="save"]').trigger('click')
    expect(page.find('[data-test="dialog-error"]').text()).toContain('已存在')
    expect(api.create).not.toHaveBeenCalled()

    await page.find('[data-test="name"]').setValue('包材')
    await page.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '包材', separate: true }),
    )
    expect(page.find('[data-test="notice"]').text()).toContain('包材')
  })

  it('moves a type to a group and applies the groups to open orders', async () => {
    perms.add('menu.followupTemplate.update')
    api.overview.mockResolvedValue(data())
    api.updateType.mockResolvedValue(data())
    api.apply.mockResolvedValue({ orders: 12, seriesStarted: 3, seriesEnded: 1 })
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="type-group-PK"]').setValue(1)
    await flushPromises()
    expect(api.updateType).toHaveBeenCalledWith(11, '包材', '1')

    await page.find('[data-test="apply"]').trigger('click')
    await flushPromises()
    expect(page.find('[data-test="notice"]').text()).toBe(
      '已检查 12 个进行中订单：新增 3 个跟进任务，结束 1 个',
    )
    expect(api.overview).toHaveBeenCalledTimes(2)
  })

  it('adds a type by hand and removes a group', async () => {
    perms.add('menu.followupTemplate.update')
    api.overview.mockResolvedValue(data())
    api.addType.mockResolvedValue(data())
    api.remove.mockResolvedValue(data({ groups: [] }))
    const page = mount(Page, { global: { stubs } })
    await flushPromises()
    await page.find('[data-test="add-type-btn"]').trigger('click')
    expect(page.find('[data-test="error"]').text()).toContain('50')
    await page.find('[data-test="new-code"]').setValue('EL')
    await page.find('[data-test="add-type-btn"]').trigger('click')
    await flushPromises()
    expect(api.addType).toHaveBeenCalledWith('EL', '', null)

    await page.find('[data-test="remove"]').trigger('click')
    await page.find('[data-test="confirm-remove"]').trigger('click')
    await flushPromises()
    expect(api.remove).toHaveBeenCalledWith(1)
    expect(page.findAll('[data-test="group-row"]')).toHaveLength(0)
  })
})
