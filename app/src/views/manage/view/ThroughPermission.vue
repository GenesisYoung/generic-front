<script lang="ts" setup>
/**
 * Permission-centric allocation view ("by permission" angle).
 *
 * Layout: a left rail listing navigation menus, and a right roster panel
 * with two modes toggled by `viewMode`:
 *  - 'approve'  — pick a menu + user, then grant/revoke individual
 *                 permissions for that user on that menu.
 *  - 'register' — pick a menu only, then register/unregister which
 *                 permissions are relevant to that menu at all.
 *
 * Toggles are optimistic: the switch flips immediately and is rolled back
 * with an error dialog if the backend rejects the change.
 */
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import { Perm } from '@/assets/config/auth'
import { useAuthStore } from '@/stores/auth'
import { globalUtil } from '@/utils/util'
import { computed, inject, onActivated, onMounted, ref } from 'vue'

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

interface UserOption {
  id: number
  name: string
  displayName: string | null
}

interface PermissionAccessItem {
  id: number
  permissionCode: string
  /** What the user holds now: the department default with this page's override applied. */
  granted: boolean
  /** What the user's department role gives. */
  defaultGranted: boolean
  /** True when this page overrides the department default for this user. */
  overridden: boolean
}

interface PermissionRegistrationItem {
  id: number
  permissionCode: string
  registered: boolean
}

// ── Left rail: menu list ─────────────────────────────────────────────────────
const menus = ref<MenuItem[]>([])
const menuSearch = ref('')
const currentMenu = ref<MenuItem | null>(null)
// Server-side pagination for the menu rail (1-based in the UI, 0-based on the wire).
const menuPage = ref(1)
const menuPageCount = ref(0)

// ── User picker (approve mode only) ──────────────────────────────────────────
const users = ref<UserOption[]>([])
const currentUser = ref<UserOption | null>(null)

// Which roster the right panel shows: user grants or menu registrations.
const viewMode = ref<'approve' | 'register'>('approve')

// ── Roster data (per selected menu / user) ───────────────────────────────────
const roster = ref<PermissionAccessItem[]>([]) // approve mode
const rosterLoading = ref(false)

const registrations = ref<PermissionRegistrationItem[]>([]) // register mode
const registrationsLoading = ref(false)

// Shared search box + granted/registered filter for both roster modes.
const rosterSearch = ref('')
const rosterFilter = ref<'all' | 'on' | 'off'>('all')

const filteredMenus = computed(() => {
  const q = menuSearch.value.trim().toLowerCase()
  if (!q) return menus.value
  return menus.value.filter(
    (m) => m.titleKey.toLowerCase().includes(q) || (m.route ?? '').toLowerCase().includes(q),
  )
})

const filteredRoster = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase()
  return roster.value.filter((p) => {
    const matchesQuery = !q || p.permissionCode.toLowerCase().includes(q)
    // 'on' keeps granted items, 'off' keeps non-granted, 'all' keeps both.
    const matchesFilter =
      rosterFilter.value === 'all' || (rosterFilter.value === 'on') === p.granted
    return matchesQuery && matchesFilter
  })
})

const filteredRegistrations = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase()
  return registrations.value.filter((p) => {
    const matchesQuery = !q || p.permissionCode.toLowerCase().includes(q)
    const matchesFilter =
      rosterFilter.value === 'all' || (rosterFilter.value === 'on') === p.registered
    return matchesQuery && matchesFilter
  })
})

const grantedCount = computed(() => roster.value.filter((p) => p.granted).length)
const registeredCount = computed(() => registrations.value.filter((p) => p.registered).length)

async function fetchMenus(page: number) {
  menuPage.value = page
  const resp = await http.get(`manager/menu/fetch/valid?page=${page - 1}&size=10`)
  menus.value = resp.data.content ?? []
  menuPageCount.value = resp.data.totalPages ?? 0
}

async function fetchUsers() {
  const resp = await http.get('root/user/fetch?page=0&size=200')
  users.value = resp.data.content ?? []
}

/** Loads the grant roster for the selected menu + user (approve mode). */
async function fetchRoster() {
  if (!currentMenu.value || !currentUser.value) {
    roster.value = []
    return
  }
  rosterLoading.value = true
  try {
    const resp = await http.get(
      `permission/menu/permission?navId=${currentMenu.value.id}&userId=${currentUser.value.id}`,
    )
    roster.value = resp.data ?? []
  } finally {
    rosterLoading.value = false
  }
}

/** Loads the registration roster for the selected menu (register mode). */
async function fetchRegistrations() {
  if (!currentMenu.value) {
    registrations.value = []
    return
  }
  registrationsLoading.value = true
  try {
    const resp = await http.get(`permission/menu/registration?navId=${currentMenu.value.id}`)
    registrations.value = resp.data ?? []
  } finally {
    registrationsLoading.value = false
  }
}

/** Resets search/filter and reloads whichever roster the current mode shows. */
async function refreshRoster() {
  rosterFilter.value = 'all'
  rosterSearch.value = ''
  if (viewMode.value === 'register') {
    await fetchRegistrations()
  } else {
    await fetchRoster()
  }
}

async function selectMenu(menu: MenuItem) {
  currentMenu.value = menu
  await refreshRoster()
}

async function selectUser() {
  await refreshRoster()
}

async function toggleViewMode() {
  viewMode.value = viewMode.value === 'approve' ? 'register' : 'approve'
  await refreshRoster()
}

/**
 * Grants/revokes a permission for the current user on the current menu. The
 * backend keeps an override only while the value differs from the department
 * default. Optimistic update: flip the UI first, roll back on backend failure.
 */
async function togglePermission(perm: PermissionAccessItem) {
  const next = !perm.granted
  const wasOverridden = perm.overridden
  perm.granted = next
  perm.overridden = next !== perm.defaultGranted
  const resp = await http.post('permission/manipulate/permission', {
    navId: currentMenu.value?.id,
    userId: currentUser.value?.id,
    permissionId: perm.id,
    granted: next,
  })
  if (resp.data.code != 200) {
    perm.granted = !next
    perm.overridden = wasOverridden
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
}

/**
 * Registers/unregisters a permission on the current menu (no user involved).
 * Optimistic update with rollback, same as togglePermission.
 */
async function toggleRegistration(perm: PermissionRegistrationItem) {
  const next = !perm.registered
  perm.registered = next
  const resp = await http.post('permission/manipulate/registration', {
    navId: currentMenu.value?.id,
    permissionId: perm.id,
    registered: next,
  })
  if (resp.data.code != 200) {
    perm.registered = !next
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
}

// Cached tabs must reload after the permission catalogue changes on another tab.
onActivated(async () => {
  try {
    await refreshRoster()
  } catch {
    roster.value = []
    registrations.value = []
  }
})

onMounted(async () => {
  await Promise.all([fetchMenus(1), fetchUsers()])
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
              <v-spacer />
              <v-btn
                size="small"
                variant="tonal"
                :prepend-icon="viewMode === 'approve' ? 'mdi-cog-outline' : 'mdi-arrow-left'"
                @click="toggleViewMode"
              >
                {{ viewMode === 'approve' ? lan?.manageRegistrations : lan?.backToApprovals }}
              </v-btn>
            </div>

            <v-autocomplete
              v-if="viewMode === 'approve'"
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
                <v-list-item
                  v-bind="props"
                  :title="item.displayName || item.name"
                  :subtitle="item.name"
                />
              </template>
            </v-autocomplete>

            <p v-if="!currentMenu.route?.trim()" class="roster-desc">
              此项控制目录菜单的显示。父目录与子页面需分别授权，目录授权不会授予子页面的业务操作权限。
            </p>
            <p class="roster-desc">
              {{
                viewMode === 'approve'
                  ? lan?.togglePermissionAccessDesc
                  : lan?.toggleRegistrationDesc
              }}
            </p>

            <div v-if="viewMode === 'register' || currentUser" class="roster-controls">
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
                <v-btn value="on" size="small">
                  {{ viewMode === 'approve' ? lan?.granted : lan?.registered }}
                </v-btn>
                <v-btn value="off" size="small">
                  {{ viewMode === 'approve' ? lan?.notGranted : lan?.notRegistered }}
                </v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <article v-if="viewMode === 'approve' && !currentUser" class="center py-8">
            {{ lan?.selectUserPrompt }}
          </article>
          <template v-else-if="viewMode === 'approve'">
            <v-list v-if="!rosterLoading && filteredRoster.length > 0" density="compact">
              <v-list-item v-for="perm in filteredRoster" :key="perm.id">
                <template #prepend>
                  <v-icon icon="mdi-key-outline" class="mr-1" />
                </template>
                <v-list-item-title class="mono">{{ perm.permissionCode }}</v-list-item-title>
                <v-list-item-subtitle
                  >{{ lan?.permissionValue }}: {{ perm.id }}</v-list-item-subtitle
                >
                <template #append>
                  <span
                    class="status-pill mr-2"
                    :class="perm.overridden ? 'warning' : 'neutral'"
                    data-test="permission-source"
                  >
                    {{
                      perm.overridden ? lan?.permissionOverridden : lan?.permissionFromDepartment
                    }}
                  </span>
                  <span class="status-pill mr-2" :class="perm.granted ? 'success' : 'neutral'">
                    {{ perm.granted ? lan?.granted : lan?.notGranted }}
                  </span>
                  <!-- Granting needs the permission itself too: nobody hands out what they lack. -->
                  <v-switch
                    :model-value="perm.granted"
                    :disabled="
                      !auth.can(Perm.permissions.update) ||
                      (!perm.granted && !auth.can(perm.permissionCode))
                    "
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
          <template v-else>
            <v-list
              v-if="!registrationsLoading && filteredRegistrations.length > 0"
              density="compact"
            >
              <v-list-item v-for="perm in filteredRegistrations" :key="perm.id">
                <template #prepend>
                  <v-icon icon="mdi-link-variant" class="mr-1" />
                </template>
                <v-list-item-title class="mono">{{ perm.permissionCode }}</v-list-item-title>
                <v-list-item-subtitle
                  >{{ lan?.permissionValue }}: {{ perm.id }}</v-list-item-subtitle
                >
                <template #append>
                  <span class="status-pill mr-2" :class="perm.registered ? 'success' : 'neutral'">
                    {{ perm.registered ? lan?.registered : lan?.notRegistered }}
                  </span>
                  <v-switch
                    :model-value="perm.registered"
                    :disabled="!auth.can(Perm.permissions.update)"
                    color="success"
                    hide-details
                    density="compact"
                    @update:model-value="toggleRegistration(perm)"
                  />
                </template>
              </v-list-item>
            </v-list>
            <article v-else class="center py-8">
              {{ registrationsLoading ? lan?.loading : lan?.noAvaiableData }}
            </article>

            <div v-if="!registrationsLoading && registrations.length > 0" class="roster-foot">
              <span class="mono">{{ registeredCount }} / {{ registrations.length }}</span>
              {{ lan?.registeredSummary }}
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
