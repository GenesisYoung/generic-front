<script setup lang="ts">
/**
 * Permission list management (child tab of /permission/management).
 *
 * Permission codes use a dotted "root.child" convention (e.g. "user.read").
 * The flat page returned by the backend is regrouped client-side into a
 * two-level tree: `permissionRoot` holds the distinct root segments and
 * `permission` maps each root to its child entries, rendered as
 * checkbox-selectable v-list-groups.
 */
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import TheForm from '@/assets/components/utils/TheForm.vue'
import { globalUtil } from '@/utils/util'
import { inject, onMounted, ref } from 'vue'

// Active i18n string map, provided by the app root.
type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
const currentPage = ref(1)
const pageSize = ref(10)
const pageCount = ref(0)
const permissionsRespsonse = ref<
  Array<{ id: number; permissionCode: string; val: number; show: string }>
>([])
const showForm = ref(false)
const selections = ref([])
const rootSelections = ref([])
const permissionRoot = ref(new Set<string>())
const permission = ref(
  new Map<string, { id: number; permissionCode: string; val: number; show: string }[]>(),
)
const formData = ref<{
  id: number | null
  permissionCode: string
  val: number | null
}>({
  id: null,
  permissionCode: '',
  val: null,
})
/**
 * Loads one page of permissions and rebuilds the root → children grouping
 * by splitting each permissionCode on the first '.'.
 */
const fetchPermissions = async (page: number) => {
  currentPage.value = page
  permissionRoot.value = new Set<string>()
  permission.value = new Map<
    string,
    { id: number; permissionCode: string; val: number; show: string }[]
  >()
  const resp = await http.get(
    `/admin/permissions/fetch?page=${currentPage.value - 1}&size=${pageSize.value}`,
  )
  if (resp.data.content) {
    permissionsRespsonse.value = resp.data.content
    permissionsRespsonse.value.forEach((ele) => {
      const val = ele.permissionCode
      const v = val.split('.')
      if (v[0] != undefined) {
        permissionRoot.value.add(v[0])
        if (!permission.value.get(v[0])) {
          permission.value.set(
            v[0],
            new Array<{
              id: number
              permissionCode: string
              val: number
              show: string
            }>(),
          )
        }
        if (v[1] != undefined && permission.value.get(v[0]) != undefined) {
          const list = permission.value.get(v[0])
          list?.push({ id: ele.id, val: ele.val, permissionCode: ele.permissionCode, show: v[1] })
          if (list != undefined) permission.value.set(v[0], list)
        }
      }
    })
    pageCount.value = resp.data.totalPages
  }
}
async function addRecord() {
  showForm.value = true
  formData.value = { id: null, permissionCode: '', val: null }
}
async function submitData() {
  const resp = http.post('/admin/permissions/save', formData.value)
  if ((await resp).data.code != 200) {
    globalUtil.activeDialog(lan?.error, (await resp).data.message, undefined)
  }
  showForm.value = false
  await fetchPermissions(currentPage.value)
}
function cancel() {
  showForm.value = false
  formData.value = { id: null, permissionCode: '', val: null }
}
/**
 * Deletes the selected entries. Selection values are mixed: child rows use
 * numeric ids, root group rows use their string root code — so they are
 * split and sent to two different delete endpoints.
 */
async function remove() {
  const numbers = ref([])
  const strings = ref([])
  selections.value.forEach((ele) => {
    if (Number.isInteger(ele)) {
      numbers.value.push(ele)
    } else {
      strings.value.push(ele)
    }
  })
  const resp_1 = await http.post('/admin/permissions/delete', { deleteVal: numbers.value })
  const resp_2 = await http.post('/admin/permissions/deleteRoot', { deleteVal: strings.value })
  if (resp_1.data.status != 200) {
    globalUtil.activeDialog(lan?.error, resp_1.data.message, undefined)
  }
  if (resp_2.data.status != 200) {
    globalUtil.activeDialog(lan?.error, resp_2.data.message, undefined)
  }
  showForm.value = false
  await fetchPermissions(currentPage.value)
}

onMounted(async () => {
  await fetchPermissions(currentPage.value)
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <v-btn color="primary" @click="addRecord">{{ lan?.addPermission }}</v-btn>
      <v-btn color="red" variant="tonal" @click="remove">{{ lan?.removePermission }}</v-btn>
      <v-text-field
        :label="lan?.name"
        append-icon="mdi-magnify"
        hide-details
        density="compact"
        class="auto-grow"
        style="min-width: 220px; max-width: 360px"
      />
    </div>
    <div v-if="permissionRoot.size > 0" class="surface-card pa-0">
      <v-list v-model:selected="selections" select-strategy="classic">
        <v-list-group v-for="root in permissionRoot" :key="root">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" :title="root" :value="root">
              <template v-slot:prepend="{ isSelected, select }">
                <v-list-item-action start>
                  <v-checkbox-btn
                    :model-value="isSelected"
                    @update:model-value="select"
                  ></v-checkbox-btn>
                </v-list-item-action>
              </template>
            </v-list-item>
          </template>
          <v-list-item
            v-for="val in permission.get(root)"
            :key="val.id"
            :value="val.id"
            :title="val.show"
            :subtitle="val.id"
          >
            <template v-slot:prepend="{ isSelected, select }">
              <v-list-item-action start>
                <v-checkbox-btn
                  :model-value="isSelected"
                  @update:model-value="select"
                ></v-checkbox-btn>
              </v-list-item-action>
            </template>
          </v-list-item>
        </v-list-group>
      </v-list>
    </div>
    <article v-else class="center py-8">{{ lan?.noAvaiableData }}</article>
    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <v-text-field :label="lan?.name" v-model="formData.permissionCode" />
            <v-btn :text="lan?.submit" color="green" class="mr-2" @click="submitData" />
            <v-btn :text="lan?.cancel" color="red" @click="cancel" />
          </v-col>
        </v-row>
      </template>
    </the-form>
    <pagination-bar
      v-if="permissionRoot.size > 0"
      :current-page="currentPage"
      :total-pages="pageCount"
      @update:current-page="fetchPermissions"
    />
  </div>
</template>

<style></style>
