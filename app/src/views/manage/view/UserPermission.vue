<script lang="ts" setup>
/**
 * User-centric allocation view ("by user" angle).
 *
 * Layout: a left rail listing navigation menus; selecting one loads the
 * full user roster for that menu into the right panel, where each user's
 * access can be granted/revoked with a switch.
 *
 * Toggles are optimistic: the switch flips immediately and is rolled back
 * with an error dialog if the backend rejects the change.
 * Sibling view: ThroughPermission.vue (same data, permission-centric).
 */
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import { Perm } from '@/assets/config/auth'
import { useAuthStore } from '@/stores/auth'
import { globalUtil } from '@/utils/util'
import { computed, inject, onMounted, ref } from 'vue'

// Active i18n string map, provided by the app root.
type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
const auth = useAuthStore()

interface MenuItem {
  id: number
  parentId: number | null
  titleKey: string
  icon: string
  route: string | null
  color: string
}

interface UserAccessItem {
  id: number
  username: string
  displayName: string | null
  email: string | null
  granted: boolean
}

// ── Left rail: menu list ─────────────────────────────────────────────────────
const menus = ref<MenuItem[]>([])
const menuSearch = ref('')
const currentMenu = ref<MenuItem | null>(null)
// Server-side pagination for the menu rail (1-based in the UI, 0-based on the wire).
const menuPage = ref(1)
const menuPageCount = ref(0)

// ── Right panel: user roster for the selected menu ───────────────────────────
const roster = ref<UserAccessItem[]>([])
const rosterLoading = ref(false)
const rosterSearch = ref('')
const rosterFilter = ref<'all' | 'on' | 'off'>('all') // granted / not-granted filter

const filteredMenus = computed(() => {
  const q = menuSearch.value.trim().toLowerCase()
  if (!q) return menus.value
  return menus.value.filter(
    (m) => m.titleKey.toLowerCase().includes(q) || (m.route ?? '').toLowerCase().includes(q),
  )
})

const filteredRoster = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase()
  return roster.value.filter((u) => {
    const matchesQuery =
      !q || u.username.toLowerCase().includes(q) || (u.displayName ?? '').toLowerCase().includes(q)
    const matchesFilter =
      rosterFilter.value === 'all' || (rosterFilter.value === 'on') === u.granted
    return matchesQuery && matchesFilter
  })
})

const grantedCount = computed(() => roster.value.filter((u) => u.granted).length)

async function fetchMenus(page: number) {
  menuPage.value = page
  const resp = await http.get(`manager/menu/fetch/valid?page=${page - 1}&size=10`)
  menus.value = resp.data.content ?? []
  menuPageCount.value = resp.data.totalPages ?? 0
}

/** Selects a menu, resets filters, and loads its user roster. */
async function selectMenu(menu: MenuItem) {
  currentMenu.value = menu
  rosterFilter.value = 'all'
  rosterSearch.value = ''
  rosterLoading.value = true
  try {
    const resp = await http.get(`permission/menu/${menu.id}/users`)
    roster.value = resp.data ?? []
  } finally {
    rosterLoading.value = false
  }
}

/**
 * Grants/revokes menu access for one user.
 * Optimistic update: flip the UI first, roll back on backend failure.
 */
async function toggleUser(user: UserAccessItem) {
  const next = !user.granted
  user.granted = next
  const resp = await http.post('permission/manipulate/user', {
    navId: currentMenu.value?.id,
    userId: user.id,
    granted: next,
  })
  if (resp.data.code != 200) {
    user.granted = !next
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
}

onMounted(async () => {
  await fetchMenus(1)
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
            :subtitle="menu.route?.trim() || '目录菜单（无链接）'"
            @click="selectMenu(menu)"
          />
        </v-list>
        <pagination-bar
          v-if="menus.length > 0"
          :current-page="menuPage"
          :total-pages="menuPageCount"
          @update:current-page="fetchMenus"
        />
      </div>

      <div class="roster surface-card pa-0">
        <template v-if="!currentMenu">
          <article class="center py-8">{{ lan?.selectMenuPrompt }}</article>
        </template>
        <template v-else>
          <div class="roster-head">
            <div class="roster-title-row">
              <h2>{{ currentMenu.titleKey }}</h2>
              <v-chip size="small" variant="tonal">{{
                currentMenu.route?.trim() || '目录菜单（无链接）'
              }}</v-chip>
            </div>
            <p v-if="!currentMenu.route?.trim()" class="roster-desc">
              此项控制目录菜单的显示。父目录与子页面需分别授权，目录授权不会授予子页面的业务操作权限。
            </p>
            <p class="roster-desc">{{ lan?.toggleUserAccessDesc }}</p>
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
          </div>

          <v-list v-if="!rosterLoading && filteredRoster.length > 0" density="compact">
            <v-list-item v-for="user in filteredRoster" :key="user.id">
              <template #prepend>
                <v-avatar size="32" color="primary" class="mr-1">
                  <span class="text-caption">{{ user.username.slice(0, 2).toUpperCase() }}</span>
                </v-avatar>
              </template>
              <v-list-item-title>{{ user.displayName || user.username }}</v-list-item-title>
              <v-list-item-subtitle>{{ user.email || user.username }}</v-list-item-subtitle>
              <template #append>
                <span class="status-pill mr-2" :class="user.granted ? 'success' : 'neutral'">
                  {{ user.granted ? lan?.granted : lan?.notGranted }}
                </span>
                <v-switch
                  :model-value="user.granted"
                  :disabled="!auth.can(Perm.permissions.update)"
                  color="success"
                  hide-details
                  density="compact"
                  @update:model-value="toggleUser(user)"
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.access-workspace {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: var(--space-5);
  min-height: 560px;
}
@media (max-width: 1100px) {
  .access-workspace {
    grid-template-columns: 1fr;
  }
}
.rail,
.roster {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
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
  flex-wrap: wrap;
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
