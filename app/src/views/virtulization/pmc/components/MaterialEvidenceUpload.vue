<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { uploadAuditEvidence } from '@/features/order-audit/api'
import { evidenceApi } from '@/features/order-audit/evidence-api'
import { errorMessage } from '@/features/order-audit/workflow'
const evidenceRef = defineModel<string>({ required: true })
const props = defineProps<{
  materialName: string
  disabled: boolean
  taskId?: string
  lockVersion?: number
  canUploadTask?: boolean
}>()
const emit = defineEmits<{ busy: [boolean] }>()
const file = ref<File | File[] | null>(null)
const purpose = ref('')
const uploading = ref(false)
const loading = ref(false)
const canUploadPersonal = ref(false)
const error = ref('')
const uploadedName = ref('')
const canUpload = computed(() =>
  props.taskId ? props.canUploadTask === true : canUploadPersonal.value,
)
onMounted(async () => {
  if (props.taskId) return
  loading.value = true
  try {
    canUploadPersonal.value = (await evidenceApi.metadata()).canUpload
  } catch {
    canUploadPersonal.value = false
  } finally {
    loading.value = false
  }
})
async function upload() {
  if (props.disabled || uploading.value || !canUpload.value) return
  const selected = Array.isArray(file.value) ? file.value[0] : file.value
  error.value = ''
  if (!selected) {
    error.value = '请选择凭证文件。'
    return
  }
  const usage = purpose.value.trim() || props.materialName.trim()
  if (!usage) {
    error.value = '请填写资料名称或凭证用途。'
    return
  }
  if (selected.size > 20 * 1024 * 1024) {
    error.value = '凭证最多20MB。'
    return
  }
  uploading.value = true
  emit('busy', true)
  try {
    if (props.taskId && props.lockVersion == null)
      throw new Error('任务版本缺失，请重新打开编辑窗口。')
    const receipt = props.taskId
      ? await uploadAuditEvidence(props.taskId, selected, usage, props.lockVersion!)
      : await evidenceApi.upload(selected, usage, crypto.randomUUID())
    evidenceRef.value = receipt.evidenceRef
    uploadedName.value = receipt.fileName
    file.value = null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    uploading.value = false
    emit('busy', false)
  }
}
</script>
<template>
  <section class="material-evidence">
    <p class="mb-2">
      资料凭证：可直接上传，成功后自动填入本项。PDF、PNG、JPEG、UTF-8 文本，最多20MB。
    </p>
    <template v-if="canUpload">
      <v-file-input
        v-model="file"
        label="本项凭证文件"
        accept=".pdf,.png,.jpg,.jpeg,.txt"
        :disabled="disabled || uploading"
        clearable
      />
      <v-text-field
        v-model="purpose"
        label="凭证用途（默认使用资料名称）"
        maxlength="1000"
        :disabled="disabled || uploading"
      />
      <v-btn
        variant="outlined"
        :disabled="disabled || uploading"
        :loading="uploading"
        @click="upload"
        >上传并关联本项</v-btn
      >
    </template>
    <p v-else-if="loading">正在检查上传权限…</p>
    <p v-else class="mb-2">当前没有直接上传权限，可填写已有凭证编号。</p>
    <v-alert v-if="error" type="error" class="my-2" role="alert">{{ error }}</v-alert>
    <v-alert v-if="uploadedName" type="success" class="my-2"
      >{{ uploadedName }} 已上传，编号已填入本项。保存草稿后完成资料关联。</v-alert
    >
    <v-text-field
      v-model="evidenceRef"
      label="凭证编号（上传后自动填入，也可填写已有编号）"
      :disabled="disabled || uploading"
      class="mt-3"
    />
  </section>
</template>
