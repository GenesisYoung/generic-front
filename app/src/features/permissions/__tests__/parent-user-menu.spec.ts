import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ can: () => true }) }))
vi.mock('@/utils/util', () => ({ globalUtil: { activeDialog: vi.fn() } }))
import Page from '@/views/manage/view/UserPermission.vue'
const box = defineComponent({ template: '<div><slot/></div>' })
const item = defineComponent({
  props: ['title'],
  emits: ['click'],
  template:
    '<div class="menu-item" @click="$emit(\'click\')">{{title}}<slot/><slot name="append"/></div>',
})
const toggle = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<button @click="$emit(\'update:modelValue\',!modelValue)">toggle</button>',
})
const stubs = {
  VList: box,
  VListItem: item,
  VBtn: box,
  VTextField: box,
  VChip: box,
  VBtnToggle: box,
  VListItemTitle: box,
  VListItemSubtitle: box,
  VSwitch: toggle,
  PaginationBar: box,
}
describe('direct directory menu grants', () => {
  it('grants only the selected unlinked parent without granting its child pages', async () => {
    http.get.mockImplementation(async (url: string) => ({
      data: url.startsWith('manager/')
        ? {
            content: [
              { id: 1, titleKey: 'pmc', route: '' },
              { id: 2, parentId: 1, titleKey: 'audit', route: '/audit' },
            ],
            totalPages: 1,
          }
        : [{ id: 320, username: 'PMC', granted: false }],
    }))
    http.post.mockResolvedValue({ data: { code: 200 } })
    const wrapper = mount(Page, { global: { stubs, provide: { lan: {} } } })
    try {
      await flushPromises()
      await wrapper.get('.rail .menu-item').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('目录菜单（无链接）')
      await wrapper.findComponent(toggle).get('button').trigger('click')
      await flushPromises()
      expect(http.post).toHaveBeenCalledExactlyOnceWith('permission/manipulate/user', {
        navId: 1,
        userId: 320,
        granted: true,
      })
    } finally {
      wrapper.unmount()
    }
  })
})
