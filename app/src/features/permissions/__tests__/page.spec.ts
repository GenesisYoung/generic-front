import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: () => true }) }))
import Page from '@/views/manage/view/PermissionList.vue'
import PaginationBar from '@/assets/components/PaginationBar.vue'
const box = defineComponent({ template: '<div><slot/></div>' })
const group = defineComponent({
  template: '<div class="group"><slot name="activator" :props="{}"/><slot/></div>',
})
const item = defineComponent({
  props: ['title', 'subtitle'],
  template:
    '<div class="item"><slot name="prepend"/><strong>{{title}}</strong><span>{{subtitle}}</span><slot/></div>',
})
const checkbox = defineComponent({
  inheritAttrs: false,
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\',$event.target.checked)"/>',
})
const button = defineComponent({
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot/></button>',
})
const text = defineComponent({
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template:
    '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\',$event.target.value)"/>',
})
const stubs = {
  VList: box,
  VListGroup: group,
  VListItem: item,
  VListItemAction: box,
  VCheckboxBtn: checkbox,
  VBtn: button,
  VTextField: text,
  VAlert: box,
  VProgressLinear: box,
  VPagination: box,
}
const rows = [
  { id: 112, permissionCode: 'menu.evidence.read' },
  { id: 113, permissionCode: 'menu.evidence.create' },
  { id: 120, permissionCode: 'menu.order-audit-task.rules.configure' },
]
let page: VueWrapper
beforeEach(() => {
  vi.resetAllMocks()
  http.get.mockResolvedValue({ data: { content: rows, totalPages: 2 } })
  http.post.mockResolvedValue({ data: { status: 200 } })
})
afterEach(() => page?.unmount())
async function open() {
  page = mount(Page, { global: { stubs, provide: { lan: {} } } })
  await flushPromises()
}
const remove = () => page.findAll('button').find((b) => b.text().startsWith('移除权限'))!
describe('recursive permission management page', () => {
  it('renders actual leaves at arbitrary depth with the original full codes and IDs', async () => {
    await open()
    expect(page.text()).toContain('configure')
    expect(page.text()).toContain('menu.order-audit-task.rules.configure · 编号 120')
    expect(page.findAll('.group')).toHaveLength(4)
    expect(
      page
        .findAll('input[type="checkbox"]')
        .filter((c) => c.attributes('aria-label')?.includes('选择权限')),
    ).toHaveLength(3)
  })
  it('removes only selected real IDs in a page group and never calls cascading prefix deletion', async () => {
    await open()
    await page.get('[aria-label="选择分组 menu.evidence 的当前页记录"]').setValue(true)
    await remove().trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.post).toHaveBeenCalledWith('/admin/permissions/delete', {
      deleteVal: expect.arrayContaining([112, 113]),
    })
    expect(http.post.mock.calls[0]?.[1].deleteVal).toHaveLength(2)
  })
  it('clears previous-page selection and uses the real server pagination', async () => {
    await open()
    await page.get('[aria-label="选择权限 menu.evidence.read，编号 112"]').setValue(true)
    http.get.mockResolvedValueOnce({
      data: { content: [{ id: 130, permissionCode: 'pmc.order-audit.scope.team' }], totalPages: 2 },
    })
    page.findComponent(PaginationBar).vm.$emit('update:currentPage', 2)
    await flushPromises()
    expect(http.get).toHaveBeenLastCalledWith('/admin/permissions/fetch', {
      params: { page: 1, size: 10, name: undefined },
    })
    expect(remove().attributes('disabled')).toBeDefined()
    expect(page.text()).not.toContain('编号 112')
    expect(page.text()).toContain('pmc.order-audit.scope.team')
  })
  it('retains a readable error rather than showing old results after a failed page load', async () => {
    await open()
    http.get.mockRejectedValueOnce(new Error('读取失败'))
    page.findComponent(PaginationBar).vm.$emit('update:currentPage', 2)
    await flushPromises()
    expect(page.text()).toContain('读取失败')
    expect(page.text()).not.toContain('编号 112')
    expect(remove().attributes('disabled')).toBeDefined()
  })
})
