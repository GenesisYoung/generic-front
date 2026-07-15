<template>
  <v-container>
    <v-row :justify="`end`" :align="'baseline'">
      <v-col :cols="2"
        ><v-btn color="deep-purple" @click="addRecord">{{ lan?.addRootPermission }}</v-btn></v-col
      >
      <v-col :cols="2"
        ><v-btn color="red">{{ lan?.removeRootPermission }}</v-btn></v-col
      >
      <v-col :cols="4">
        <v-text-field :label="lan?.name" append-icon="mdi-magnify" />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <ul>
          <li v-for="value in rootPermissions" :v-id="value.id" :value="value.val">
            {{ value.permissionName }}
          </li>
        </ul>
      </v-col>
    </v-row>
    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <v-text-field :label="lan?.name" :model-value="formData?.name" />
            <v-btn :text="lan?.submit" color="green" class="ml-2" @click="submitData" />
            <v-btn :text="lan?.cancel" color="red" class="ml-2" @click="cancel" />
          </v-col>
        </v-row>
      </template>
    </the-form>
  </v-container>
</template>

<script setup lang="ts">
import http from '@/api/http'
import TheForm from '@/assets/components/utils/TheForm.vue'
import { inject, ref } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
const currentPage = ref(0)
const pageSize = ref(10)
const rootPermissions = ref<Array<{ id: number; permissionName: string; val: number }>>([])
const showForm = ref(false)
const formData = ref<{ id: number | null; name: string; val: number | null } | undefined>(undefined)
const fetchPermissions = async () => {
  const resp = await http.get(
    `/admin/permissions/fetch?page=${currentPage.value}&size=${pageSize.value}`,
  )
  if (resp.data.object) {
    rootPermissions.value = resp.data.object
  }
}
async function addRecord() {
  showForm.value = true
  formData.value = { id: null, name: '', val: null }
}
async function submitData() {
  const resp = http.post('/admin/permissions/save', formData, {
    headers: { 'Content-Type': 'json' },
  })
  console.log((await resp).data)
}
function cancel() {
  showForm.value = false
  formData.value = { id: null, name: '', val: null }
}
await fetchPermissions()
</script>
