<script lang="ts" setup>
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import { inject, onMounted, ref } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')

interface NavigationPermissionItem {
  id: number
  navId: number
  navKey: string
  route: string
  uId: number
  uName: string
  pId: number
  pName: string
  pVal: number
}

const items = ref<NavigationPermissionItem[]>([])
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const pageCount = ref(0)

const filter = ref({
  uName: '',
  navName: '',
  route: '',
})

const fetchData = async (page: number) => {
  currentPage.value = page
  isLoading.value = true
  try {
    const resp = await http.post('permission/fetch', {
      page: currentPage.value - 1,
      size: pageSize.value,
      filter: {
        uName: filter.value.uName.trim() || null,
        navName: filter.value.navName.trim() || null,
        pName: null,
        route: filter.value.route.trim() || null,
      },
    })
    items.value = resp.data.content ?? []
    pageCount.value = resp.data.totalPages ?? 0
  } finally {
    isLoading.value = false
  }
}

function search() {
  fetchData(1)
}

function resetFilter() {
  filter.value = { uName: '', navName: '', route: '' }
  fetchData(1)
}

onMounted(async () => {
  await fetchData(1)
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <v-text-field
        v-model="filter.uName"
        :label="lan?.userName"
        hide-details
        density="compact"
        class="auto-grow"
        style="min-width: 160px; max-width: 240px"
        @keyup.enter="search"
      />
      <v-text-field
        v-model="filter.navName"
        :label="lan?.navTitleKey"
        hide-details
        density="compact"
        class="auto-grow"
        style="min-width: 160px; max-width: 240px"
        @keyup.enter="search"
      />
      <v-text-field
        v-model="filter.route"
        :label="lan?.menuRoute"
        hide-details
        density="compact"
        class="auto-grow"
        style="min-width: 160px; max-width: 240px"
        @keyup.enter="search"
      />
      <v-btn color="primary" prepend-icon="mdi-magnify" @click="search">{{ lan?.search }}</v-btn>
      <v-btn variant="tonal" @click="resetFilter">{{ lan?.reset }}</v-btn>
    </div>
    <div v-if="items.length > 0" class="table-wrapper">
      <v-table>
        <thead>
          <tr>
            <th>{{ lan?.userName }}</th>
            <th>{{ lan?.navTitleKey }}</th>
            <th>{{ lan?.menuRoute }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.uName }}</td>
            <td>{{ item.navKey }}</td>
            <td>{{ item.route }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>
    <article v-else class="center py-8">
      {{ isLoading ? lan?.loading : lan?.noAvaiableData }}
    </article>
    <pagination-bar
      v-if="items.length > 0"
      :current-page="currentPage"
      :total-pages="pageCount"
      @update:current-page="fetchData"
    />
  </div>
</template>
