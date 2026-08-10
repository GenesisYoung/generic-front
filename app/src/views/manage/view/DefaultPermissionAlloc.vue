<script lang="ts" setup>
/**
 * Default permission allocation view (role &harr; permission).
 *
 * Layout: a left rail listing roles (paginated, 20/page) with add ("+") and
 * per-row delete ("-"); selecting a role loads that role's permission roster
 * into the right panel (also paginated, 20/page), where each permission is
 * marked "Processed" (a role_permission_tb link exists) or "Not granted" and
 * can be toggled.
 *
 * A role that still has users assigned to it cannot be deleted — the backend
 * rejects the delete (HTTP 423) and the reason is surfaced in a dialog.
 * Permission toggles are optimistic: the switch flips immediately and is
 * rolled back with an error dialog if the backend rejects the change.
 */
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import TheForm from '@/assets/components/utils/TheForm.vue'
import { globalUtil } from '@/utils/util'
import { inject, onMounted, ref } from 'vue'

// Active i18n string map, provided by the app root.
type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')

const PAGE_SIZE = 20

interface RoleItem {
  id: number
  roleName: string
  val: number | null
}

interface PermissionItem {
  id: number
  permissionCode: string
  granted: boolean
}

// ── Left rail: role list ─────────────────────────────────────────────────────
const roles = ref<RoleItem[]>([])
const rolePage = ref(1)
const rolePageCount = ref(0)
const currentRole = ref<RoleItem | null>(null)

// ── Right panel: permission roster for the selected role ─────────────────────
const permissions = ref<PermissionItem[]>([])
const permPage = ref(1)
const permPageCount = ref(0)
const permLoading = ref(false)

// ── Add-role form ────────────────────────────────────────────────────────────
const showForm = ref(false)
const formData = ref<{ id: number | null; roleName: string; val: number | null }>({
  id: null,
  roleName: '',
  val: null,
})

/** Loads one page of roles. */
async function fetchRoles(page: number) {
  rolePage.value = page
  const resp = await http.get(`/admin/roles/fetch?page=${page - 1}&size=${PAGE_SIZE}`)
  roles.value = resp.data.content ?? []
  rolePageCount.value = resp.data.totalPages ?? 0
}

/** Selects a role and loads the first page of its permission roster. */
async function selectRole(role: RoleItem) {
  currentRole.value = role
  await fetchPermissions(1)
}

/** Loads one page of permissions for the current role, flagged with status. */
async function fetchPermissions(page: number) {
  if (!currentRole.value) return
  permPage.value = page
  permLoading.value = true
  try {
    const resp = await http.get(
      `/admin/roles/${currentRole.value.id}/permissions?page=${page - 1}&size=${PAGE_SIZE}`,
    )
    permissions.value = resp.data.content ?? []
    permPageCount.value = resp.data.totalPages ?? 0
  } finally {
    permLoading.value = false
  }
}

/**
 * Grants/revokes a permission for the current role.
 * Optimistic update: flip the UI first, roll back on backend failure.
 */
async function togglePermission(permission: PermissionItem) {
  const next = !permission.granted
  permission.granted = next
  const resp = await http.post('/admin/roles/permission', {
    roleId: currentRole.value?.id,
    permissionId: permission.id,
    granted: next,
  })
  if (resp.data.code != 200) {
    permission.granted = !next
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
}

function addRole() {
  formData.value = { id: null, roleName: '', val: null }
  showForm.value = true
}

async function submitRole() {
  const resp = await http.post('/admin/roles/save', formData.value)
  if (resp.data.code != 200) {
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
    return
  }
  showForm.value = false
  await fetchRoles(rolePage.value)
}

function cancelForm() {
  showForm.value = false
}

/**
 * Deletes a role after confirmation. The backend refuses deletion (code 423)
 * when users are still assigned to the role; the reason is shown in a dialog.
 */
async function deleteRole(role: RoleItem) {
  const ok = await globalUtil.activeDialog(lan?.deleteRole, lan?.deleteRoleContent, 'mdi-alert', 2)
  if (!ok) return
  const resp = await http.delete(`/admin/roles/delete/${role.id}`)
  if (resp.data.code != 200) {
    globalUtil.activeDialog(lan?.error, resp.data.message ?? lan?.deleteFail, undefined)
    return
  }
  if (currentRole.value?.id === role.id) {
    currentRole.value = null
    permissions.value = []
  }
  await fetchRoles(rolePage.value)
}

onMounted(async () => {
  await fetchRoles(1)
})
</script>

<template>
  <div class="page">
    <div class="alloc-workspace">
      <!-- Role list -->
      <div class="rail surface-card pa-0">
        <div class="rail-head">
          <span class="rail-label">{{ lan?.roleList }}</span>
          <v-btn icon="mdi-plus" size="small" variant="tonal" color="primary" @click="addRole" />
        </div>
        <v-list v-if="roles.length > 0" density="compact" nav>
          <v-list-item
            v-for="role in roles"
            :key="role.id"
            :active="currentRole?.id === role.id"
            :title="role.roleName"
            :subtitle="`#${role.id}`"
            @click="selectRole(role)"
          >
            <template #append>
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="text"
                color="red"
                @click.stop="deleteRole(role)"
              />
            </template>
          </v-list-item>
        </v-list>
        <article v-else class="center py-8">{{ lan?.noAvaiableData }}</article>
        <pagination-bar
          v-if="rolePageCount > 1"
          :current-page="rolePage"
          :total-pages="rolePageCount"
          @update:current-page="fetchRoles"
        />
      </div>

      <!-- Associated permissions -->
      <div class="roster surface-card pa-0">
        <template v-if="!currentRole">
          <article class="center py-8">{{ lan?.selectRolePrompt }}</article>
        </template>
        <template v-else>
          <div class="roster-head">
            <div class="roster-title-row">
              <h2>{{ currentRole.roleName }}</h2>
              <v-chip size="small" variant="tonal">#{{ currentRole.id }}</v-chip>
            </div>
            <p class="roster-desc">{{ lan?.associatedPermissions }}</p>
          </div>

          <v-list v-if="!permLoading && permissions.length > 0" density="compact">
            <v-list-item v-for="perm in permissions" :key="perm.id">
              <v-list-item-title>{{ perm.permissionCode }}</v-list-item-title>
              <v-list-item-subtitle>#{{ perm.id }}</v-list-item-subtitle>
              <template #append>
                <span class="status-pill mr-2" :class="perm.granted ? 'success' : 'neutral'">
                  {{ perm.granted ? lan?.processed : lan?.notGranted }}
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
            {{ permLoading ? lan?.loading : lan?.noAvaiableData }}
          </article>

          <pagination-bar
            v-if="permPageCount > 1"
            :current-page="permPage"
            :total-pages="permPageCount"
            @update:current-page="fetchPermissions"
          />
        </template>
      </div>
    </div>

    <!-- Add-role modal -->
    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <v-text-field :label="lan?.roleName" v-model="formData.roleName" />
            <v-text-field :label="lan?.roleValue" v-model.number="formData.val" type="number" />
            <v-btn :text="lan?.submit" color="green" class="mr-2" @click="submitRole" />
            <v-btn :text="lan?.cancel" color="red" @click="cancelForm" />
          </v-col>
        </v-row>
      </template>
    </the-form>
  </div>
</template>

<style scoped>
.alloc-workspace {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--space-5);
  min-height: 560px;
}
@media (max-width: 760px) {
  .alloc-workspace {
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
  align-items: center;
  justify-content: space-between;
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
  gap: var(--space-2);
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
</style>
