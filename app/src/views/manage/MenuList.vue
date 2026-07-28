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
  titleKey: string
  icon: string
  route: string
  color: string
}

const emptyForm = (): MenuItem => ({ id: null, titleKey: '', icon: '', route: '', color: '' })

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
  <v-container>
    <v-row :justify="'end'" :align="'baseline'">
      <v-col :cols="2">
        <v-btn color="deep-purple" @click="addRecord">{{ lan?.addMenu }}</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col v-if="menus.length > 0">
        <v-table>
          <thead>
            <tr>
              <th>{{ lan?.menuId }}</th>
              <th>{{ lan?.menuTitleKey }}</th>
              <th>{{ lan?.menuIcon }}</th>
              <th>{{ lan?.menuRoute }}</th>
              <th>{{ lan?.menuColor }}</th>
              <th>{{ lan?.actions }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in menus" :key="item.id ?? undefined">
              <td>{{ item.id }}</td>
              <td>{{ item.titleKey }}</td>
              <td>
                <v-icon :color="item.color" :icon="formatIcon(item.icon)" class="mr-1" />
                {{ item.icon }}
              </td>
              <td>{{ item.route }}</td>
              <td>
                <v-chip :color="item.color" size="small">{{ item.color }}</v-chip>
              </td>
              <td>
                <v-btn color="indigo" size="small" class="mr-2" @click="editRecord(item)">
                  {{ lan?.edit }}
                </v-btn>
                <v-btn color="red" size="small" @click="remove(item)">{{ lan?.delete }}</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
      <v-col v-else>
        <article style="text-align: center">{{ lan?.noAvaiableData }}</article>
      </v-col>
    </v-row>
    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <h3 class="mb-2">{{ editing ? lan?.editMenu : lan?.addMenu }}</h3>
            <v-text-field :label="lan?.menuTitleKey" v-model="formData.titleKey" />
            <v-text-field :label="lan?.menuIcon" v-model="formData.icon" />
            <v-text-field :label="lan?.menuRoute" v-model="formData.route" />
            <v-text-field :label="lan?.menuColor" v-model="formData.color" />
            <v-btn :text="lan?.submit" color="green" class="ml-2" @click="submitData" />
            <v-btn :text="lan?.cancel" color="red" class="ml-2" @click="cancel" />
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
  </v-container>
</template>

<style></style>
