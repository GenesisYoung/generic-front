<script setup lang="ts">
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import TheForm from '@/assets/components/utils/TheForm.vue'
import utilStore from '@/stores/utils'
import { globalUtil } from '@/utils/util'
import { inject, onMounted, ref } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')

interface MenuItem {
  id: number | null
  parentId: number | null
  titleKey: string
  icon: string
  route: string
  color: string
}

const emptyForm = (): MenuItem => ({
  id: null,
  parentId: null,
  titleKey: '',
  icon: '',
  route: '',
  color: '',
})

const menus = ref<MenuItem[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const pageCount = ref(0)
const showForm = ref(false)
const editing = ref(false)
const formData = ref<MenuItem>(emptyForm())

function formatIcon(iconName: string | undefined): string {
  if (!iconName) return ''
  if (iconName.startsWith('mdi-')) return iconName
  return `mdi-${iconName}`
}

const fetchMenus = async (page: number) => {
  currentPage.value = page
  const resp = await http.get(
    `manager/menu/fetch?page=${currentPage.value - 1}&size=${pageSize.value}`,
  )
  if (resp.data.content) {
    menus.value = resp.data.content
    pageCount.value = resp.data.totalPages
  }
}

function addRecord() {
  editing.value = false
  formData.value = emptyForm()
  showForm.value = true
}

function editRecord(item: MenuItem) {
  editing.value = true
  formData.value = { ...item }
  showForm.value = true
}

function cancel() {
  showForm.value = false
  formData.value = emptyForm()
}

function updateColor(color: string) {
  formData.value.color = color
}

async function submitData() {
  const resp = await http.post('manager/menu/save', formData.value)
  if (resp.data.code != 200) {
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
  showForm.value = false
  await fetchMenus(currentPage.value)
}

async function remove(item: MenuItem) {
  await globalUtil.activeDialog(lan?.deleteMenu, lan?.deleteMenuContent, undefined, 2)
  if (!utilStore().globalDialogValue) {
    return
  }
  const resp = await http.post('manager/menu/delete', { deleteVal: [item.id] })
  if (resp.data.code != 200) {
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
  await fetchMenus(currentPage.value)
}

onMounted(async () => {
  await fetchMenus(currentPage.value)
})
</script>

<template>
  <div class="page">
    <div class="toolbar" style="justify-content: flex-end">
      <v-btn color="primary" @click="addRecord">{{ lan?.addMenu }}</v-btn>
    </div>
    <div v-if="menus.length > 0" class="table-wrapper">
      <v-table>
        <thead>
          <tr>
            <th>{{ lan?.menuId }}</th>
            <th>{{ lan?.parentId }}</th>
            <th>{{ lan?.menuTitleKey }}</th>
            <th>{{ lan?.menuIcon }}</th>
            <th>{{ lan?.menuRoute }}</th>
            <th>{{ lan?.menuColor }}</th>
            <th class="actions-col">{{ lan?.actions }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in menus" :key="item.id ?? undefined">
            <td>{{ item.id }}</td>
            <td>{{ item.parentId }}</td>
            <td>{{ item.titleKey }}</td>
            <td>
              <v-icon :color="item.color" :icon="formatIcon(item.icon)" class="mr-1" />
              {{ item.icon }}
            </td>
            <td>{{ item.route }}</td>
            <td>
              <v-chip :color="item.color" size="small">{{ item.color }}</v-chip>
            </td>
            <td class="actions-col">
              <v-btn color="indigo" size="small" class="mr-2" @click="editRecord(item)">
                {{ lan?.edit }}
              </v-btn>
              <v-btn color="red" size="small" @click="remove(item)">{{ lan?.delete }}</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
    <article v-else class="center py-8">{{ lan?.noAvaiableData }}</article>
    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <h3 class="mb-2">{{ editing ? lan?.editMenu : lan?.addMenu }}</h3>
            <v-text-field :label="lan?.menuTitleKey" v-model="formData.titleKey" />
            <v-text-field :label="lan?.parentId" v-model="formData.parentId" />
            <v-text-field :label="lan?.menuIcon" v-model="formData.icon" />
            <v-text-field :label="lan?.menuRoute" v-model="formData.route" />
            <v-text-field :label="lan?.menuColor" v-model="formData.color" />
            <div class="color-select-bar mb-2">
              <v-chip color="indigo" class="mr-2" @click="updateColor('indigo')">indigo</v-chip
              ><v-chip
                color="deep-purple-darken-1"
                class="mr-2"
                @click="updateColor('deep-purple-darken-1')"
                >deep-purple-darken-1</v-chip
              >
              <v-chip color="blue-darken-1" class="mr-2" @click="updateColor('blue-darken-1')"
                >blue-darken-1</v-chip
              >
              <v-chip color="cyan-darken-1" class="mr-2" @click="updateColor('cyan-darken-1')"
                >cyan-darken-1</v-chip
              >
            </div>
            <v-btn :text="lan?.submit" color="green" class="mr-2" @click="submitData" />
            <v-btn :text="lan?.cancel" color="red" @click="cancel" />
          </v-col>
        </v-row>
      </template>
    </the-form>
    <pagination-bar
      v-if="menus.length > 0"
      :current-page="currentPage"
      :total-pages="pageCount"
      @update:current-page="fetchMenus"
    />
  </div>
</template>
