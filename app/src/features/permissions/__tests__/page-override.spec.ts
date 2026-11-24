import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: () => true }) }))
vi.mock('@/utils/util', () => ({ globalUtil: { activeDialog: vi.fn() } }))
import Page from '@/views/manage/view/ThroughPermission.vue'

// "By Permission": the user gets the department role's permissions by
// default; a switch here overrides one of them for this user on this page.
const box = defineComponent({ template: '<div><slot/><slot name="append"/></div>' })
const item = defineComponent({
  emits: ['click'],
  template: '<div class="menu-item" @click="$emit(\'click\')"><slot/><slot name="append"/></div>',
})
const picker = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div/>',
})
const toggle = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input class="switch" type="checkbox" @click="$emit(\'update:modelValue\', !modelValue)" />',
})
const stubs = {
  VList: box,
  VListItem: item,
  VBtn: defineComponent({ template: '<button><slot/></button>' }),
  VAutocomplete: picker,
  VTextField: box,
  VListItemTitle: box,
  VListItemSubtitle: box,
  VSpacer: box,
  VIcon: box,
  VChip: box,
  VBtnToggle: box,
  VSwitch: toggle,
  PaginationBar: box,
}
const lan = { permissionFromDepartment: 'DEPT', permissionOverridden: 'OVERRIDE' }
let wrapper: VueWrapper

afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})

describe('page overrides on top of the department default', () => {
  it('shows the source of each permission and flips it when toggled', async () => {
    http.get.mockImplementation(async (url: string) => {
      if (url.startsWith('manager/menu/'))
        return { data: { content: [{ id: 18, titleKey: 'x', route: '/x' }], totalPages: 1 } }
      if (url.startsWith('root/user/')) return { data: { content: [{ id: 320, name: 'PMC' }] } }
      return {
        data: [
          {
            id: 1,
            permissionCode: 'menu.x.read',
            granted: true,
            defaultGranted: true,
            overridden: false,
          },
          {
            id: 2,
            permissionCode: 'menu.x.update',
            granted: false,
            defaultGranted: true,
            overridden: true,
          },
        ],
      }
    })
    http.post.mockResolvedValue({ data: { code: 200 } })
    wrapper = mount(Page, { global: { stubs, provide: { lan } } })
    await flushPromises()
    await wrapper.get('.menu-item').trigger('click')
    wrapper.findComponent(picker).vm.$emit('update:modelValue', { id: 320, name: 'PMC' })
    await flushPromises()

    const sources = () => wrapper.findAll('[data-test="permission-source"]').map((s) => s.text())
    expect(sources()).toEqual(['DEPT', 'OVERRIDE'])

    // Turning "update" back on matches the department default: no override any more.
    await wrapper.findAll('.switch')[1]!.trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledWith('permission/manipulate/permission', {
      navId: 18,
      userId: 320,
      permissionId: 2,
      granted: true,
    })
    expect(sources()).toEqual(['DEPT', 'DEPT'])

    // Turning "read" off takes the default away on this page.
    await wrapper.findAll('.switch')[0]!.trigger('click')
    await flushPromises()
    expect(sources()).toEqual(['OVERRIDE', 'DEPT'])
  })
})
