import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: () => true }) }))
vi.mock('@/utils/util', () => ({ globalUtil: { activeDialog: vi.fn() } }))
import Page from '@/views/manage/view/ThroughPermission.vue'
const box = defineComponent({ template: '<div><slot/></div>' })
const item = defineComponent({
  props: ['title'],
  emits: ['click'],
  template: '<div class="menu-item" @click="$emit(\'click\')">{{title}}<slot/></div>',
})
const picker = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div/>',
})
const button = defineComponent({ template: '<button><slot/></button>' })
const stubs = {
  VList: box,
  VListItem: item,
  VBtn: button,
  VAutocomplete: picker,
  VTextField: box,
  VListItemTitle: box,
  VListItemSubtitle: box,
  VSpacer: box,
  VIcon: box,
  VBtnToggle: box,
  VSwitch: box,
  PaginationBar: box,
}
let wrapper: VueWrapper
const show = ref(true)
let deleted = false
const code = 'menu.evidence.create'
async function open(mode: 'approve' | 'register', route: string | null = '/pmc/evidence') {
  show.value = true
  deleted = false
  http.get.mockImplementation(async (url: string) => {
    if (url.startsWith('manager/menu/'))
      return {
        data: {
          content: [{ id: 18, titleKey: 'evidenceManagement', route }],
          totalPages: 1,
        },
      }
    if (url.startsWith('root/user/')) return { data: { content: [{ id: 320, name: 'PMC' }] } }
    return {
      data: deleted ? [] : [{ id: 113, permissionCode: code, granted: false, registered: true }],
    }
  })
  const other = defineComponent({ template: '<div>other</div>' })
  wrapper = mount(
    defineComponent({
      setup: () => () => h(KeepAlive, null, { default: () => (show.value ? h(Page) : h(other)) }),
    }),
    {
      global: { stubs, provide: { lan: { manageRegistrations: '管理权限' } } },
    },
  )
  await flushPromises()
  await wrapper.get('.rail .menu-item').trigger('click')
  if (mode === 'register') {
    await wrapper.get('button').trigger('click')
  } else {
    wrapper.findComponent(picker).vm.$emit('update:modelValue', { id: 320, name: 'PMC' })
  }
  await flushPromises()
  expect(wrapper.text()).toContain(code)
}
afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})
describe('directory permission allocation', () => {
  it('allows selecting and registering permissions for an unlinked parent menu', async () => {
    await open('register', '')
    expect(wrapper.text()).toContain('目录菜单（无链接）')
    expect(wrapper.text()).toContain('父目录与子页面需分别授权')
    expect(http.get).toHaveBeenCalledWith('permission/menu/registration?navId=18')
  })
})
describe('cached permission allocation tab', () => {
  for (const mode of ['approve', 'register'] as const) {
    it(`reloads ${mode} permissions after returning from deletion on another tab`, async () => {
      await open(mode)
      show.value = false
      await flushPromises()
      deleted = true
      http.get.mockClear()
      show.value = true
      await flushPromises()
      expect(http.get).toHaveBeenCalledWith(
        mode === 'approve'
          ? 'permission/menu/permission?navId=18&userId=320'
          : 'permission/menu/registration?navId=18',
      )
      expect(wrapper.text()).not.toContain(code)
    })
  }
})
