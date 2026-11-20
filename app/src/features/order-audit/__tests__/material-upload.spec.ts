import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
const api = vi.hoisted(() => ({ task: vi.fn(), metadata: vi.fn(), personal: vi.fn() }))
vi.mock('@/features/order-audit/api', () => ({ uploadAuditEvidence: api.task }))
vi.mock('@/features/order-audit/evidence-api', () => ({
  evidenceApi: { metadata: api.metadata, upload: api.personal },
}))
import Upload from '@/views/virtulization/pmc/components/MaterialEvidenceUpload.vue'
import DraftForm from '@/views/virtulization/pmc/components/OrderAuditDraftForm.vue'
import { emptyDraft } from '../model'
const box = defineComponent({ template: '<section><slot/></section>' })
const file = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="file"/>',
})
const text = defineComponent({
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template:
    '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"/>',
})
const button = defineComponent({
  props: ['loading', 'disabled'],
  template: '<button :disabled="loading || disabled"><slot/></button>',
})
const stubs = {
  VFileInput: file,
  VTextField: text,
  VBtn: button,
  VAlert: box,
  VRow: box,
  VCol: box,
  VCard: box,
  VSelect: box,
  VCheckbox: box,
  VTextarea: box,
}
let page: VueWrapper
beforeEach(() => {
  vi.resetAllMocks()
  api.metadata.mockResolvedValue({ canUpload: true })
  api.task.mockResolvedValue({ evidenceRef: 'audit:new', fileName: '订单.pdf' })
  api.personal.mockResolvedValue({ evidenceRef: 'evidence:new', fileName: '订单.pdf' })
})
afterEach(() => page?.unmount())
async function open(props: Record<string, unknown> = {}) {
  page = mount(Upload, {
    props: { modelValue: 'audit:old', materialName: '客户订单', disabled: false, ...props },
    global: { stubs },
  })
  await flushPromises()
}
async function chooseAndUpload(wrapper = page, selected = new File(['proof'], '订单.pdf')) {
  wrapper.findComponent(file).vm.$emit('update:modelValue', selected)
  await flushPromises()
  await wrapper.get('button').trigger('click')
  await flushPromises()
}
describe('inline material evidence upload', () => {
  it('uploads directly to an existing task and returns the reference with balanced busy events', async () => {
    await open({ taskId: 't1', lockVersion: 7, canUploadTask: true })
    await chooseAndUpload()
    expect(api.task).toHaveBeenCalledWith('t1', expect.any(File), '客户订单', 7)
    expect(page.emitted('update:modelValue')).toEqual([['audit:new']])
    expect(page.emitted('busy')).toEqual([[true], [false]])
    expect(api.personal).not.toHaveBeenCalled()
    expect(page.text()).toContain('编号已填入本项')
  })
  it('supports upload before a new draft has a task ID', async () => {
    await open()
    await chooseAndUpload()
    expect(api.personal).toHaveBeenCalledWith(expect.any(File), '客户订单', expect.any(String))
    expect(page.emitted('update:modelValue')).toEqual([['evidence:new']])
    expect(api.task).not.toHaveBeenCalled()
  })
  it('keeps the old reference on failure and allows retry', async () => {
    await open({ taskId: 't1', lockVersion: 7, canUploadTask: true })
    api.task.mockRejectedValueOnce(new Error('上传失败'))
    await chooseAndUpload()
    expect(page.emitted('update:modelValue')).toBeUndefined()
    expect(page.text()).toContain('上传失败')
    await page.get('button').trigger('click')
    await flushPromises()
    expect(page.emitted('update:modelValue')).toEqual([['audit:new']])
  })
  it('does not expose task uploads without the existing task capability', async () => {
    await open({ taskId: 't1', lockVersion: 7, canUploadTask: false })
    expect(page.findComponent(file).exists()).toBe(false)
    expect(page.text()).toContain('没有直接上传权限')
    expect(api.task).not.toHaveBeenCalled()
    expect(api.metadata).not.toHaveBeenCalled()
  })
  it('rejects files larger than 20MB without starting a request', async () => {
    await open()
    const large = new File(['x'], '大文件.pdf')
    Object.defineProperty(large, 'size', { value: 21 * 1024 * 1024 })
    await chooseAndUpload(page, large)
    expect(page.text()).toContain('凭证最多20MB')
    expect(api.personal).not.toHaveBeenCalled()
  })
  it('fills only the matching material in a multi-material draft', async () => {
    const draft = emptyDraft()
    draft.materials = ['客户订单', '图纸'].map((name, i) => ({
      id: String(i),
      name,
      required: true,
      status: 3,
      missingParts: '',
      ownerUserId: null,
      expectedAt: null,
      actualAt: null,
      evidenceRef: '',
    }))
    page = mount(DraftForm, {
      props: {
        modelValue: draft,
        users: [],
        disabled: false,
        editing: true,
        taskId: 't1',
        lockVersion: 7,
        canUploadTask: true,
      },
      global: { stubs },
    })
    await flushPromises()
    await chooseAndUpload(page.findAllComponents(Upload)[1]!)
    expect(api.task).toHaveBeenCalledWith('t1', expect.any(File), '图纸', 7)
    expect(draft.materials.map((m) => m.evidenceRef)).toEqual(['', 'audit:new'])
  })
})
