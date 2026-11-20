<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { evidenceApi, type PersonalEvidence } from '@/features/order-audit/evidence-api'
import { saveDownload } from '@/features/order-audit/api'
import { errorMessage } from '@/features/order-audit/workflow'
const items = ref<PersonalEvidence[]>([]),
  total = ref(0),
  page = ref(1),
  size = ref(20),
  keyword = ref('')
const ready = ref(false),
  canUpload = ref(false),
  loading = ref(false),
  uploading = ref(false),
  downloading = ref(false),
  error = ref(''),
  uploadError = ref(''),
  notice = ref('')
const file = ref<File | File[] | null>(null),
  purpose = ref(''),
  receipt = ref<PersonalEvidence | null>(null)
const pages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))
let serial = 0,
  applied = '',
  retry: { file: File; purpose: string; key: string } | null = null
const date = (s: string) => new Date(s).toLocaleString('zh-CN')
const bytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`
async function load() {
  if (!ready.value) return
  const token = ++serial
  loading.value = true
  error.value = ''
  items.value = []
  total.value = 0
  try {
    const result = await evidenceApi.list(applied, page.value, size.value)
    if (token !== serial) return
    items.value = result.items
    total.value = result.total
    if (page.value > Math.max(1, Math.ceil(result.total / size.value))) {
      page.value = Math.max(1, Math.ceil(result.total / size.value))
      await load()
    }
  } catch (e) {
    if (token === serial) error.value = errorMessage(e)
  } finally {
    if (token === serial) loading.value = false
  }
}
async function init() {
  const token = ++serial
  ready.value = false
  loading.value = true
  error.value = ''
  canUpload.value = false
  try {
    const meta = await evidenceApi.metadata()
    if (token !== serial) return
    canUpload.value = meta.canUpload
    ready.value = true
    await load()
  } catch (e) {
    if (token === serial) {
      error.value = errorMessage(e)
      loading.value = false
    }
  }
}
async function search() {
  applied = keyword.value?.trim() || ''
  page.value = 1
  await load()
}
async function upload() {
  const selected = Array.isArray(file.value) ? file.value[0] : file.value
  if (uploading.value || !canUpload.value) return
  if (!selected || !purpose.value.trim()) {
    uploadError.value = '请选择文件并填写凭证用途。'
    return
  }
  if (selected.size > 20 * 1024 * 1024 || !selected.size) {
    uploadError.value = '凭证须为非空且不超过20MB的文件。'
    return
  }
  // An uncertain timeout can be retried with the same key and unchanged file.
  if (!retry || retry.file !== selected || retry.purpose !== purpose.value.trim())
    retry = { file: selected, purpose: purpose.value.trim(), key: crypto.randomUUID() }
  uploading.value = true
  uploadError.value = ''
  try {
    receipt.value = await evidenceApi.upload(selected, retry.purpose, retry.key)
    retry = null
    file.value = null
    purpose.value = ''
    notice.value = '上传成功，可复制编号用于本人业务记录。'
    page.value = 1
    await load()
  } catch (e) {
    uploadError.value = errorMessage(e)
  } finally {
    uploading.value = false
  }
}
async function download(item: PersonalEvidence) {
  if (downloading.value) return
  downloading.value = true
  error.value = ''
  try {
    saveDownload(await evidenceApi.download(item.evidenceRef), item.fileName)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    downloading.value = false
  }
}
async function copy(ref: string) {
  try {
    await navigator.clipboard.writeText(ref)
    notice.value = '凭证编号已复制。'
  } catch {
    notice.value = '复制失败，请选中凭证编号手动复制。'
  }
}
onMounted(init)
onBeforeUnmount(() => {
  ++serial
})
</script>
<template>
  <v-container fluid>
    <div class="d-flex align-center ga-3 mb-4">
      <div class="flex-grow-1">
        <h1 class="text-h5">凭证管理</h1>
        <p class="text-body-2 mt-2">
          独立上传本人证明文件，复制编号用于业务规则、订单评审或审批依据。
        </p>
      </div>
      <v-btn variant="outlined" :disabled="loading || uploading" @click="init">刷新</v-btn>
    </div>
    <v-alert type="info" variant="tonal" class="mb-4"
      >此处只显示本人上传的凭证，不需要先建立订单任务。凭证被本人引用到业务任务后，该任务的授权人员可按任务权限查阅。当前支持PDF、PNG、JPEG、UTF-8文本，最多20MB。</v-alert
    >
    <v-alert v-if="error" type="error" class="mb-3"
      >{{ error }}<v-btn variant="text" :disabled="loading" @click="init">重试</v-btn></v-alert
    >
    <v-card v-if="ready && canUpload" title="上传凭证" variant="outlined" class="mb-4"
      ><v-card-text>
        <v-alert v-if="uploadError" type="error" class="mb-3">{{ uploadError }}</v-alert>
        <v-file-input
          v-model="file"
          label="凭证文件 *"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          :disabled="uploading"
        />
        <v-textarea
          v-model="purpose"
          label="凭证用途 *"
          rows="2"
          maxlength="1000"
          :disabled="uploading"
        />
        <v-btn color="primary" :loading="uploading" @click="upload">上传</v-btn>
      </v-card-text></v-card
    >
    <p v-else-if="ready" class="mb-4">当前账号可查看本人凭证，上传需要另行授予上传权限。</p>
    <v-card v-if="receipt" title="最近上传成功" variant="tonal" class="mb-4"
      ><v-card-text
        ><p>{{ receipt.fileName }} · {{ bytes(receipt.size) }}</p>
        <v-text-field
          :model-value="receipt.evidenceRef"
          label="凭证编号（可选中复制）"
          readonly
        /><v-btn variant="outlined" @click="copy(receipt.evidenceRef)">复制编号</v-btn></v-card-text
      ></v-card
    >
    <v-card variant="outlined"
      ><v-card-text
        ><form @submit.prevent="search">
          <div class="d-flex flex-wrap align-center ga-3">
            <v-text-field
              v-model="keyword"
              label="文件名称／用途／凭证编号"
              maxlength="100"
              hide-details
              clearable
            /><v-btn type="submit" :disabled="!ready || loading">查询</v-btn>
          </div>
        </form></v-card-text
      >
      <v-progress-linear v-if="loading" indeterminate />
      <v-table
        ><thead>
          <tr>
            <th>文件</th>
            <th>用途</th>
            <th>凭证编号</th>
            <th>上传时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.evidenceRef">
            <td>
              {{ item.fileName }}
              <div>{{ bytes(item.size) }}</div>
            </td>
            <td class="wrap">{{ item.purpose }}</td>
            <td class="wrap">{{ item.evidenceRef }}</td>
            <td>{{ date(item.uploadedAt) }}</td>
            <td class="actions">
              <v-btn size="small" variant="text" @click="copy(item.evidenceRef)">复制编号</v-btn
              ><v-btn size="small" variant="text" :disabled="downloading" @click="download(item)"
                >下载</v-btn
              >
            </td>
          </tr>
          <tr v-if="!loading && !items.length">
            <td colspan="5" class="text-center pa-6">
              {{ error ? '读取失败，请重试' : ready ? '暂无匹配的本人凭证' : '正在读取凭证信息' }}
            </td>
          </tr>
        </tbody></v-table
      >
      <div class="d-flex flex-wrap align-center ga-3 pa-3">
        <span>共{{ total }}条</span
        ><v-select
          v-model="size"
          :items="[20, 50, 100]"
          label="每页"
          hide-details
          density="compact"
          style="max-width: 110px"
          :disabled="loading || !ready"
          @update:model-value="search"
        /><v-pagination
          v-model="page"
          :length="pages"
          :total-visible="5"
          :disabled="loading || !ready"
          @update:model-value="load"
        />
      </div>
    </v-card>
    <v-snackbar :model-value="!!notice" @update:model-value="notice = ''">{{ notice }}</v-snackbar>
  </v-container>
</template>
<style scoped>
.wrap {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  min-width: 180px;
}
.actions {
  min-width: 170px;
}
</style>
