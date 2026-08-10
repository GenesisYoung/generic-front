<script lang="ts" setup>
/**
 * Department management view (department &harr; role).
 *
 * Mirrors DefaultPermissionAlloc.vue: a left rail listing departments
 * (paginated, 20/page) with add ("+") and per-row delete ("-"); selecting a
 * department loads its role roster into the right panel (paginated, 20/page),
 * where each role is marked "Processed" (a role_department_tb link exists) or
 * "Not granted" and can be toggled.
 *
 * A department that still has users assigned to it cannot be deleted — the
 * backend rejects the delete (HTTP 423) and the reason is surfaced in a dialog.
 * Role toggles are optimistic and roll back on backend failure.
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

interface DepartmentItem {
  id: number
  deptName: string
  val: number | null
  parentId: number | null
}

interface RoleItem {
  id: number
  roleName: string
  granted: boolean
}

// ── Left rail: department list ───────────────────────────────────────────────
const departments = ref<DepartmentItem[]>([])
const deptPage = ref(1)
const deptPageCount = ref(0)
const currentDept = ref<DepartmentItem | null>(null)

// ── Right panel: role roster for the selected department ─────────────────────
const rolesRoster = ref<RoleItem[]>([])
const rolePage = ref(1)
const rolePageCount = ref(0)
const roleLoading = ref(false)

// ── Add-department form ──────────────────────────────────────────────────────
const showForm = ref(false)
const formData = ref<{
  id: number | null
  deptName: string
  val: number | null
  parentId: number | null
}>({
  id: null,
  deptName: '',
  val: null,
  parentId: null,
})

/** Loads one page of departments. */
async function fetchDepartments(page: number) {
  deptPage.value = page
  const resp = await http.get(`/admin/departments/fetch?page=${page - 1}&size=${PAGE_SIZE}`)
  departments.value = resp.data.content ?? []
  deptPageCount.value = resp.data.totalPages ?? 0
}

/** Selects a department and loads the first page of its role roster. */
async function selectDepartment(dept: DepartmentItem) {
  currentDept.value = dept
  await fetchRoles(1)
}

/** Loads one page of roles for the current department, flagged with status. */
async function fetchRoles(page: number) {
  if (!currentDept.value) return
  rolePage.value = page
  roleLoading.value = true
  try {
    const resp = await http.get(
      `/admin/departments/${currentDept.value.id}/roles?page=${page - 1}&size=${PAGE_SIZE}`,
    )
    rolesRoster.value = resp.data.content ?? []
    rolePageCount.value = resp.data.totalPages ?? 0
  } finally {
    roleLoading.value = false
  }
}

/**
 * Links/unlinks a role for the current department.
 * Optimistic update: flip the UI first, roll back on backend failure.
 */
async function toggleRole(role: RoleItem) {
  const next = !role.granted
  role.granted = next
  const resp = await http.post('/admin/departments/role', {
    deptId: currentDept.value?.id,
    roleId: role.id,
    granted: next,
  })
  if (resp.data.code != 200) {
    role.granted = !next
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
  }
}

function addDepartment() {
  formData.value = { id: null, deptName: '', val: null, parentId: null }
  showForm.value = true
}

async function submitDepartment() {
  const resp = await http.post('/admin/departments/save', formData.value)
  if (resp.data.code != 200) {
    globalUtil.activeDialog(lan?.error, resp.data.message, undefined)
    return
  }
  showForm.value = false
  await fetchDepartments(deptPage.value)
}

function cancelForm() {
  showForm.value = false
}

/**
 * Deletes a department after confirmation. The backend refuses deletion
 * (code 423) when users are still assigned to it; the reason is shown.
 */
async function deleteDepartment(dept: DepartmentItem) {
  const ok = await globalUtil.activeDialog(
    lan?.deleteDepartment,
    lan?.deleteDepartmentContent,
    'mdi-alert',
    2,
  )
  if (!ok) return
  const resp = await http.delete(`/admin/departments/delete/${dept.id}`)
  if (resp.data.code != 200) {
    globalUtil.activeDialog(lan?.error, resp.data.message ?? lan?.deleteFail, undefined)
    return
  }
  if (currentDept.value?.id === dept.id) {
    currentDept.value = null
    rolesRoster.value = []
  }
  await fetchDepartments(deptPage.value)
}

onMounted(async () => {
  await fetchDepartments(1)
})
</script>

<template>
  <div class="page">
    <div class="alloc-workspace">
      <!-- Department list -->
      <div class="rail surface-card pa-0">
        <div class="rail-head">
          <span class="rail-label">{{ lan?.departmentList }}</span>
          <v-btn
            icon="mdi-plus"
            size="small"
            variant="tonal"
            color="primary"
            @click="addDepartment"
          />
        </div>
        <v-list v-if="departments.length > 0" density="compact" nav>
          <v-list-item
            v-for="dept in departments"
            :key="dept.id"
            :active="currentDept?.id === dept.id"
            :title="dept.deptName"
            :subtitle="`#${dept.id}`"
            @click="selectDepartment(dept)"
          >
            <template #append>
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="text"
                color="red"
                @click.stop="deleteDepartment(dept)"
              />
            </template>
          </v-list-item>
        </v-list>
        <article v-else class="center py-8">{{ lan?.noAvaiableData }}</article>
        <pagination-bar
          v-if="deptPageCount > 1"
          :current-page="deptPage"
          :total-pages="deptPageCount"
          @update:current-page="fetchDepartments"
        />
      </div>

      <!-- Associated roles -->
      <div class="roster surface-card pa-0">
        <template v-if="!currentDept">
          <article class="center py-8">{{ lan?.selectDepartmentPrompt }}</article>
        </template>
        <template v-else>
          <div class="roster-head">
            <div class="roster-title-row">
              <h2>{{ currentDept.deptName }}</h2>
              <v-chip size="small" variant="tonal">#{{ currentDept.id }}</v-chip>
            </div>
            <p class="roster-desc">{{ lan?.associatedRoles }}</p>
          </div>

          <v-list v-if="!roleLoading && rolesRoster.length > 0" density="compact">
            <v-list-item v-for="role in rolesRoster" :key="role.id">
              <v-list-item-title>{{ role.roleName }}</v-list-item-title>
              <v-list-item-subtitle>#{{ role.id }}</v-list-item-subtitle>
              <template #append>
                <span class="status-pill mr-2" :class="role.granted ? 'success' : 'neutral'">
                  {{ role.granted ? lan?.processed : lan?.notGranted }}
                </span>
                <v-switch
                  :model-value="role.granted"
                  color="success"
                  hide-details
                  density="compact"
                  @update:model-value="toggleRole(role)"
                />
              </template>
            </v-list-item>
          </v-list>
          <article v-else class="center py-8">
            {{ roleLoading ? lan?.loading : lan?.noAvaiableData }}
          </article>

          <pagination-bar
            v-if="rolePageCount > 1"
            :current-page="rolePage"
            :total-pages="rolePageCount"
            @update:current-page="fetchRoles"
          />
        </template>
      </div>
    </div>

    <!-- Add-department modal -->
    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <v-text-field :label="lan?.departmentName" v-model="formData.deptName" />
            <v-text-field :label="lan?.roleValue" v-model.number="formData.val" type="number" />
            <v-text-field
              :label="lan?.parentId"
              v-model.number="formData.parentId"
              type="number"
            />
            <v-btn :text="lan?.submit" color="green" class="mr-2" @click="submitDepartment" />
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
