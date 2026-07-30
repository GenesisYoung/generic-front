<script lang="ts" setup>
import http from '@/api/http'
import { globalUtil } from '@/utils/util'
import { computed, inject, onMounted, ref } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')

interface MenuItem {
  id: number
  parentId: number | null
  titleKey: string
  icon: string
  route: string
  color: string
}

interface UserOption {
  id: number
  name: string
  displayName: string | null
}

interface PermissionAccessItem {
  id: number
  permissionName: string
  val: number
  granted: boolean
}

const menus = ref<MenuItem[]>([])
const menuSearch = ref('')
const currentMenu = ref<MenuItem | null>(null)

const users = ref<UserOption[]>([])
const currentUser = ref<UserOption | null>(null)

const roster = ref<PermissionAccessItem[]>([])
const rosterLoading = ref(false)
const rosterSearch = ref('')
const rosterFilter = ref<'all' | 'on' | 'off'>('all')

const filteredMenus = computed(() => {
  const q = menuSearch.value.trim().toLowerCase()
  if (!q) return menus.value
  return menus.value.filter(
    (m) => m.titleKey.toLowerCase().includes(q) || m.route.toLowerCase().includes(q),
  )
})

const filteredRoster = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase()
  return roster.value.filter((p) => {
    const matchesQuery = !q || p.permissionName.toLowerCase().includes(q)
    const matchesFilter =
      rosterFilter.value === 'all' || (rosterFilter.value === 'on') === p.granted
    return matchesQuery && matchesFilter
  })
})

const grantedCount = computed(() => roster.value.filter((p) => p.granted).length)

async function fetchMenus() {
  const resp = await http.get('manager/menu/fetch?page=0&size=200')
  menus.value = resp.data.content ?? []
}

async function fetchUsers() {
  const resp = await http.get('root/user/fetch?page=0&size=200')
  users.value = resp.data.content ?? []
}

async function fetchRoster() {
  if (!currentMenu.value || !currentUser.value) {
    roster.value = []
    return
  }
  rosterLoading.value = true
  try {
    const resp = await http.get(
      `permission/menu/${currentMenu.value.id}/permissions?userId=${currentUser.value.id}`,
    )
    roster.value = resp.data ?? []
  } finally {
    rosterLoading.value = false
  }
}

async function selectMenu(menu: MenuItem) {
  currentMenu.value = menu
  rosterFilter.value = 'all'
  rosterSearch.value = ''
  await fetchRoster()
}

async function selectUser() {
  rosterFilter.value = 'all'
  rosterSearch.value = ''
  await fetchRoster()
}

async function togglePermission(perm: PermissionAccessItem) {
  const next = !perm.granted
  perm.granted = next
  const resp = await http.post('permission/manipulate/permission', {
    navId: currentMenu.value?.id,
    userId: currentUser.value?.id,
    permissionId: perm.id,
    granted: next,
  })
  if (resp.data.code != 200) {
    perm.granted = !next
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
}

onMounted(async () => {
  await Promise.all([fetchMenus(), fetchUsers()])
})
</script>

<template>
  <div class="page">
    <div class="access-workspace">
      <div class="rail surface-card pa-0">
        <div class="rail-head">
          <span class="rail-label">{{ lan?.menus }}</span>
          <v-text-field
            v-model="menuSearch"
            :placeholder="lan?.filterMenus"
            prepend-inner-icon="mdi-magnify"
            hide-details
            density="compact"
            variant="outlined"
          />
        </div>
        <v-list density="compact" nav>
          <v-list-item
            v-for="menu in filteredMenus"
            :key="menu.id"
            :active="currentMenu?.id === menu.id"
            :title="menu.titleKey"
            :subtitle="menu.route"
            @click="selectMenu(menu)"
          />
        </v-list>
      </div>

      <div class="roster surface-card pa-0">
        <template v-if="!currentMenu">
          <article class="center py-8">{{ lan?.selectMenuPrompt }}</article>
        </template>
        <template v-else>
          <div class="roster-head">
            <div class="roster-title-row">
              <h2>{{ currentMenu.titleKey }}</h2>
              <v-chip size="small" variant="tonal">{{ currentMenu.route }}</v-chip>
            </div>
            <v-autocomplete
              v-model="currentUser"
              :items="users"
              item-title="name"
              return-object
              :label="lan?.selectUser"
              hide-details
              density="compact"
              variant="outlined"
              style="max-width: 320px"
              @update:model-value="selectUser"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :title="item.displayName || item.name" :subtitle="item.name" />
              </template>
            </v-autocomplete>

            <template v-if="currentUser">
              <p class="roster-desc">{{ lan?.togglePermissionAccessDesc }}</p>
              <div class="roster-controls">
                <v-text-field
                  v-model="rosterSearch"
                  :placeholder="lan?.searchRoster"
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  density="compact"
                  variant="outlined"
                  class="roster-search"
                />
                <v-btn-toggle v-model="rosterFilter" mandatory density="compact" variant="outlined">
                  <v-btn value="all" size="small">{{ lan?.all }}</v-btn>
                  <v-btn value="on" size="small">{{ lan?.granted }}</v-btn>
                  <v-btn value="off" size="small">{{ lan?.notGranted }}</v-btn>
                </v-btn-toggle>
              </div>
            </template>
          </div>

          <article v-if="!currentUser" class="center py-8">{{ lan?.selectUserPrompt }}</article>
          <template v-else>
            <v-list v-if="!rosterLoading && filteredRoster.length > 0" density="compact">
              <v-list-item v-for="perm in filteredRoster" :key="perm.id">
                <template #prepend>
                  <v-icon icon="mdi-key-outline" class="mr-1" />
                </template>
                <v-list-item-title class="mono">{{ perm.permissionName }}</v-list-item-title>
                <v-list-item-subtitle>{{ lan?.permissionValue }}: {{ perm.val }}</v-list-item-subtitle>
                <template #append>
                  <span class="status-pill mr-2" :class="perm.granted ? 'success' : 'neutral'">
                    {{ perm.granted ? lan?.granted : lan?.notGranted }}
                  </span>
                  <v-switch
                    :model-value="perm.granted"
                    color="success"
                    hide-details
                    density="compact"
                    @update:model-value="togglePermission(perm)"
                  />
                </template>
              </v-list-item>
            </v-list>
            <article v-else class="center py-8">
              {{ rosterLoading ? lan?.loading : lan?.noAvaiableData }}
            </article>

            <div v-if="!rosterLoading && roster.length > 0" class="roster-foot">
              <span class="mono">{{ grantedCount }} / {{ roster.length }}</span>
              {{ lan?.accessSummary }}
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.access-workspace {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-5);
  min-height: 560px;
}
@media (max-width: 760px) {
  .access-workspace {
    grid-template-columns: 1fr;
  }
}
.rail,
.roster {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.rail-head {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.rail-label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-on-surface-variant);
}
.roster-head {
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.roster-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.roster-title-row h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}
.roster-desc {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-on-surface-variant);
}
.roster-controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.roster-search {
  flex: 1 1 220px;
}
.roster-foot {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-on-surface-variant);
}
.mono {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--color-on-surface);
}
</style>
