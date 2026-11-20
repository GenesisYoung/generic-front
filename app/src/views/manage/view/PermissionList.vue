<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { Perm } from '@/assets/config/auth'
import { useAuthStore } from '@/stores/auth'
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import TheForm from '@/assets/components/utils/TheForm.vue'
import PermissionTreeItem from '../components/PermissionTreeItem.vue'
import {
  buildPermissionTree,
  toggleRecords,
  type PermissionRecord,
} from '@/features/permissions/tree'
const lan = inject<Record<string, string>>('lan')
const auth = useAuthStore()
const currentPage = ref(1),
  pageSize = ref(10),
  pageCount = ref(0)
const records = ref<PermissionRecord[]>([]),
  selections = ref<number[]>([])
const tree = computed(() => buildPermissionTree(records.value))
const loading = ref(false),
  saving = ref(false),
  error = ref(''),
  formError = ref(''),
  name = ref(''),
  appliedName = ref(''),
  showForm = ref(false)
const formData = ref<{ id: number | null; permissionCode: string; val: number | null }>({
  id: null,
  permissionCode: '',
  val: null,
})
let generation = 0
function message(e: unknown) {
  return e instanceof Error ? e.message : '操作失败，请重试。'
}
async function fetchPermissions(page: number) {
  const token = ++generation
  loading.value = true
  error.value = ''
  records.value = []
  selections.value = []
  try {
    const resp = await http.get<{ content: PermissionRecord[]; totalPages: number }>(
      '/admin/permissions/fetch',
      { params: { page: page - 1, size: pageSize.value, name: appliedName.value || undefined } },
    )
    if (token !== generation) return
    pageCount.value = resp.data.totalPages || 0
    if (page > Math.max(1, pageCount.value)) {
      await fetchPermissions(Math.max(1, pageCount.value))
      return
    }
    currentPage.value = page
    records.value = resp.data.content || []
  } catch (e) {
    if (token === generation) error.value = message(e)
  } finally {
    if (token === generation) loading.value = false
  }
}
async function search() {
  appliedName.value = name.value.trim()
  await fetchPermissions(1)
}
function toggle(ids: number[], selected: boolean) {
  selections.value = toggleRecords(selections.value, ids, selected)
}
function addRecord() {
  formData.value = { id: null, permissionCode: '', val: null }
  formError.value = ''
  showForm.value = true
}
async function submitData() {
  if (saving.value) return
  const code = formData.value.permissionCode.trim()
  if (!code || code.split('.').some((p) => !p.trim())) {
    formError.value = '请填写完整权限码，各层级用英文句点分隔，层级名称不能为空。'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const response = await http.post('/admin/permissions/save', {
      ...formData.value,
      permissionCode: code,
    })
    if (response.data.code !== 200) throw new Error(response.data.message || '保存失败。')
    showForm.value = false
    await fetchPermissions(currentPage.value)
  } catch (e) {
    formError.value = message(e)
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (saving.value || !selections.value.length) return
  // Only real IDs loaded on this page are sent. Virtual prefixes cannot trigger
  // the legacy deleteRoot endpoint's unbounded cascading deletion.
  const valid = new Set(records.value.map((r) => r.id))
  const ids = selections.value.filter((id) => valid.has(id))
  if (!ids.length) return
  saving.value = true
  error.value = ''
  try {
    const response = await http.post('/admin/permissions/delete', { deleteVal: ids })
    if (response.data.status !== 200) throw new Error(response.data.message || '移除失败。')
    await fetchPermissions(currentPage.value)
  } catch (e) {
    error.value = message(e)
  } finally {
    saving.value = false
  }
}
onMounted(() => fetchPermissions(1))
onBeforeUnmount(() => {
  ++generation
})
</script>
<template>
  <div class="page">
    <div class="toolbar">
      <v-btn
        v-if="auth.can(Perm.permissions.create)"
        color="primary"
        :disabled="loading || saving"
        @click="addRecord"
        >{{ lan?.addPermission || '添加权限' }}</v-btn
      >
      <v-btn
        v-if="auth.can(Perm.permissions.delete)"
        color="red"
        variant="tonal"
        :disabled="loading || saving || !selections.length"
        @click="remove"
        >{{ lan?.removePermission || '移除权限'
        }}{{ selections.length ? `（${selections.length}）` : '' }}</v-btn
      >
      <v-text-field
        v-model="name"
        :label="lan?.name || '权限码'"
        append-icon="mdi-magnify"
        hide-details
        density="compact"
        class="auto-grow"
        style="min-width: 220px; max-width: 360px"
        :disabled="loading || saving"
        @click:append="search"
        @keyup.enter="search"
      />
    </div>
    <p class="text-caption mb-3">
      按完整权限码逐级展开，支持任意层级。勾选分组仅选择当前页的真实记录；移除按所选编号执行。
    </p>
    <v-alert v-if="error" type="error" class="mb-3"
      >{{ error
      }}<v-btn variant="text" :disabled="loading || saving" @click="fetchPermissions(currentPage)"
        >重试</v-btn
      ></v-alert
    >
    <v-progress-linear v-if="loading" indeterminate aria-label="正在加载权限" />
    <div v-if="tree.length" class="surface-card pa-0 permission-tree">
      <v-list open-strategy="multiple"
        ><PermissionTreeItem
          v-for="node in tree"
          :key="node.key"
          :node="node"
          :selected="selections"
          :disabled="saving || loading"
          @toggle="toggle"
      /></v-list>
    </div>
    <article v-else-if="!loading && !error" class="center py-8">
      {{ lan?.noAvaiableData || '暂无权限记录' }}
    </article>
    <the-form v-if="showForm"
      ><template #form
        ><v-row
          ><v-col>
            <v-alert v-if="formError" type="error" class="mb-3">{{ formError }}</v-alert>
            <v-text-field
              v-model="formData.permissionCode"
              :label="lan?.name || '完整权限码'"
              :disabled="saving"
              placeholder="menu.order-audit-task.rules.configure"
            />
            <v-btn
              :text="lan?.submit || '提交'"
              color="green"
              class="mr-2"
              :loading="saving"
              @click="submitData"
            />
            <v-btn
              :text="lan?.cancel || '取消'"
              color="red"
              :disabled="saving"
              @click="showForm = false"
            /> </v-col></v-row></template
    ></the-form>
    <pagination-bar
      v-if="pageCount > 1"
      :current-page="currentPage"
      :total-pages="pageCount"
      @update:current-page="fetchPermissions"
    />
  </div>
</template>
<style scoped>
.permission-tree {
  overflow-x: auto;
}
</style>
