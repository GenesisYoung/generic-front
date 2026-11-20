import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
const api = vi.hoisted(() => ({
  metadata: vi.fn(),
  list: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
}))
const save = vi.hoisted(() => vi.fn())
vi.mock('@/features/order-audit/evidence-api', () => ({ evidenceApi: api }))
vi.mock('@/features/order-audit/api', () => ({ saveDownload: save }))
import Page from '@/views/virtulization/pmc/EvidenceManagement.vue'
const box = defineComponent({ props: ['title'], template: '<div><h2>{{title}}</h2><slot/></div>' })
const button = defineComponent({
  inheritAttrs: false,
  props: ['loading'],
  template: '<button v-bind="$attrs" :disabled="loading || $attrs.disabled"><slot/></button>',
})
const text = defineComponent({
  props: ['modelValue', 'label', 'readonly'],
  emits: ['update:modelValue'],
  template:
    '<input :aria-label="label" :value="modelValue" :readonly="readonly" @input="$emit(\'update:modelValue\',$event.target.value)"/>',
})
const file = defineComponent({
  name: 'FileStub',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div>选择凭证文件</div>',
})
const stubs = {
  VContainer: box,
  VAlert: box,
  VCard: box,
  VCardText: box,
  VTable: box,
  VProgressLinear: box,
  VSelect: box,
  VPagination: box,
  VSnackbar: box,
  VBtn: button,
  VFileInput: file,
  VTextarea: text,
  VTextField: text,
}
const item = {
  evidenceRef: 'evidence:proof1',
  fileName: '规则.txt',
  purpose: '制定规则',
  size: 6,
  uploadedAt: '2026-11-17T15:00:00Z',
}
let page: VueWrapper
beforeEach(() => {
  vi.resetAllMocks()
  api.metadata.mockResolvedValue({ canUpload: true })
  api.list.mockResolvedValue({ items: [], total: 0 })
  api.upload.mockResolvedValue(item)
})
afterEach(() => page?.unmount())
async function open() {
  page = mount(Page, { global: { stubs } })
  await flushPromises()
}
const btn = (label: string) => page.findAll('button').find((b) => b.text() === label)!
describe('standalone evidence menu', () => {
  it('initializes the personal library without an order or task selection', async () => {
    api.list.mockResolvedValue({ items: [item], total: 1 })
    await open()
    expect(api.list).toHaveBeenCalledWith('', 1, 20)
    expect(page.text()).toContain('规则.txt')
    expect(page.text()).toContain('evidence:proof1')
  })
  it('uploads a standalone file and presents its reusable reference', async () => {
    await open()
    const selected = new File(['proof'], '规则.txt', { type: 'text/plain' })
    page.findComponent(file).vm.$emit('update:modelValue', selected)
    await page.get('[aria-label="凭证用途 *"]').setValue('制定规则')
    await btn('上传').trigger('click')
    await flushPromises()
    expect(api.upload).toHaveBeenCalledWith(selected, '制定规则', expect.any(String))
    expect(page.text()).toContain('最近上传成功')
    expect(page.get('[aria-label="凭证编号（可选中复制）"]').attributes('readonly')).toBeDefined()
  })
  it('keeps the file and purpose on failure and reuses the key for an unchanged retry', async () => {
    api.upload.mockRejectedValueOnce(new Error('网络暂不可用'))
    await open()
    const selected = new File(['proof'], '规则.txt')
    page.findComponent(file).vm.$emit('update:modelValue', selected)
    await page.get('[aria-label="凭证用途 *"]').setValue('规则证明')
    await btn('上传').trigger('click')
    await flushPromises()
    expect(page.text()).toContain('网络暂不可用')
    expect((page.get('[aria-label="凭证用途 *"]').element as HTMLInputElement).value).toBe(
      '规则证明',
    )
    await btn('上传').trigger('click')
    await flushPromises()
    expect(api.upload.mock.calls[0]?.[2]).toBe(api.upload.mock.calls[1]?.[2])
  })
  it('hides upload controls for readers and downloads an owned file through the API', async () => {
    api.metadata.mockResolvedValue({ canUpload: false })
    api.list.mockResolvedValue({ items: [item], total: 1 })
    api.download.mockResolvedValue(new Blob(['proof']))
    await open()
    expect(btn('上传')).toBeUndefined()
    await btn('下载').trigger('click')
    await flushPromises()
    expect(api.download).toHaveBeenCalledWith(item.evidenceRef)
    expect(save).toHaveBeenCalledWith(expect.any(Blob), '规则.txt')
  })
})
