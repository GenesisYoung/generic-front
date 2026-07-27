<script setup lang="ts">
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import TheForm from '@/assets/components/utils/TheForm.vue'
import { globalUtil } from '@/utils/util'
import { inject, onMounted, ref } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
const currentPage = ref(1)
const pageSize = ref(10)
const pageCount = ref(0)
const permissionsRespsonse = ref<
  Array<{ id: number; permissionName: string; val: number; show: string }>
>([])
const showForm = ref(false)
const selections = ref()
const permissionRoot = ref(new Set<string>())
const permission = ref(
  new Map<string, { id: number; permissionName: string; val: number; show: string }[]>(),
)
const formData = ref<{
  id: number | null
  permissionName: string
  val: number | null
}>({
  id: null,
  permissionName: '',
  val: null,
})
const fetchPermissions = async (page: number) => {
  currentPage.value = page
  permissionRoot.value = new Set<string>()
  permission.value = new Map<
    string,
    { id: number; permissionName: string; val: number; show: string }[]
  >()
  const resp = await http.get(
    `/admin/permissions/fetch?page=${currentPage.value - 1}&size=${pageSize.value}`,
  )
  if (resp.data.content) {
    permissionsRespsonse.value = resp.data.content
    permissionsRespsonse.value.forEach((ele) => {
      const val = ele.permissionName
      const v = val.split('.')
      if (v[0] != undefined) {
        permissionRoot.value.add(v[0])
        if (!permission.value.get(v[0])) {
          permission.value.set(
            v[0],
            new Array<{
              id: number
              permissionName: string
              val: number
              show: string
            }>(),
          )
        }
        if (v[1] != undefined && permission.value.get(v[0]) != undefined) {
          const list = permission.value.get(v[0])
          list?.push({ id: ele.id, val: ele.val, permissionName: ele.permissionName, show: v[1] })
          if (list != undefined) permission.value.set(v[0], list)
        }
      }
    })
    pageCount.value = resp.data.totalPages
  }
}
async function addRecord() {
  showForm.value = true
  formData.value = { id: null, permissionName: '', val: null }
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
  formData.value = { id: null, permissionName: '', val: null }
}
function remove() {
  console.log(selections.value)
}

onMounted(async () => {
  await fetchPermissions(currentPage.value)
})
</script>

<template>
  <v-container>
    <v-row :justify="`end`" :align="'baseline'">
      <v-col :cols="2"
        ><v-btn color="deep-purple" @click="addRecord">{{ lan?.addPermission }}</v-btn></v-col
      >
      <v-col :cols="2"
        ><v-btn color="red" @click="remove">{{ lan?.removePermission }}</v-btn></v-col
      >
      <v-col :cols="4">
        <v-text-field :label="lan?.name" append-icon="mdi-magnify" />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-list v-model:selected="selections" select-strategy="classic">
          <v-list-group v-for="root in permissionRoot">
            <template v-slot:activator="{ props }">
              <v-list-item v-bind="props" :title="root"></v-list-item>
            </template>
            <v-list-item
              v-for="val in permission.get(root)"
              :key="val.id"
              :value="val.val"
              :title="val.show"
              :subtitle="val.val"
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
      </v-col>
    </v-row>
    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <v-text-field :label="lan?.name" v-model="formData.permissionName" />
            <!-- <input type="text" v-model="formData.permissionName" /> -->
            <v-btn :text="lan?.submit" color="green" class="ml-2" @click="submitData" />
            <v-btn :text="lan?.cancel" color="red" class="ml-2" @click="cancel" />
          </v-col>
        </v-row>
      </template>
    </the-form>
    <pagination-bar
      :current-page="currentPage"
      :total-pages="pageCount"
      @update:current-page="fetchPermissions"
    />
  </v-container>
</template>

<style></style>
