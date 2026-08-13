<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>{{ lang?.userManage }}</h1>
        <p>{{ lang?.userManageDescription }}</p>
      </div>
      <v-btn color="primary" @click="openCreate">{{ lang?.addUser }}</v-btn>
    </header>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      closable
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>

    <div class="table-wrapper">
      <v-table class="user-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ lang?.userName }}</th>
            <th>{{ lang?.userEmail }}</th>
            <th>{{ lang?.displayName }}</th>
            <th>{{ lang?.userRole }}</th>
            <th>{{ lang?.userStatus }}</th>
            <th>{{ lang?.realName }}</th>
            <th style="min-width: 150px">{{ lang?.position }}</th>
            <th>{{ lang?.birthday }}</th>
            <th>{{ lang?.hireDate }}</th>
            <th>{{ lang?.departments }}</th>
            <th class="actions-col">{{ lang?.userActions }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="center py-8">{{ lang?.loading }}</td>
          </tr>
          <tr v-if="!isLoading && users.length === 0">
            <td colspan="7" class="center py-8">{{ lang?.noUserFound }}</td>
          </tr>
          <tr v-for="user in users" :key="user.id">
            <td :title="user.id.toString()">{{ user.id }}</td>
            <td :title="user.name">{{ user.name }}</td>
            <td :title="user.email">{{ user.email }}</td>
            <td :title="user.displayName">{{ user.displayName }}</td>
            <td style="min-width: 150px">
              <v-select
                :model-value="user.roles"
                :items="roles"
                item-title="title"
                item-value="value"
                multiple
                density="compact"
                variant="plain"
                hide-details
                disabled
              ></v-select>
            </td>
            <td>
              <span class="status-pill" :class="user.active ? 'success' : 'neutral'">
                {{ user.active ? lang?.active : lang?.disabled }}
              </span>
            </td>
            <td>{{ user.realName }}</td>
            <td>{{ user.title }}</td>
            <td>{{ user.birthday }}</td>
            <td>{{ user.hireDate }}</td>
            <td style="min-width: 250px">
              <v-select
                :label="lang?.departments"
                v-model="user.departments"
                :items="deptOptions"
                item-title="title"
                item-value="val"
                multiple
                disabled
              ></v-select>
            </td>
            <td class="actions-col">
              <v-btn
                size="small"
                class="mr-2"
                color="indigo"
                variant="flat"
                @click="openEdit(user)"
              >
                {{ lang?.edit }}
              </v-btn>
              <v-btn size="small" color="red" variant="flat" @click="deleteUser(user)">
                {{ lang?.delete }}
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <pagination-bar
      v-if="users.length > 0"
      :current-page="currentPage"
      :total-pages="pageCount"
      @update:currentPage="updatePage"
    ></pagination-bar>

    <the-form v-if="showForm">
      <template #form>
        <v-row>
          <v-col>
            <h3 class="mb-4">{{ editingUser ? lang?.editUser : lang?.createUser }}</h3>
            <v-text-field :label="lang?.userName" v-model="formUser.name" />
            <v-text-field :label="lang?.displayName" v-model="formUser.displayName" />
            <v-text-field :label="lang?.userEmail" v-model="formUser.email" type="email" />
            <!-- <input type="text" hidden :value="syncRoles(formUser.roles)" /> -->
            <v-select
              :label="lang?.userRole"
              v-model="formUser.roles"
              :items="roles"
              item-title="title"
              item-value="value"
              multiple
            ></v-select>
            <v-text-field :label="lang?.realName" v-model="formUser.realName" />
            <v-text-field :label="lang?.position" v-model="formUser.title" />
            <div class="d-flex justify-center">
              <v-date-input
                :label="lang?.birthday"
                v-model="formUser.birthday"
                input-format="MM/dd/yyyy"
                autocomplete="false"
              ></v-date-input>
            </div>
            <div class="d-flex justify-center">
              <v-date-input
                :label="lang?.hireDate"
                v-model="formUser.hireDate"
                input-format="MM/dd/yyyy"
                autocomplete="false"
              ></v-date-input>
            </div>
            <v-select
              :label="lang?.departments"
              v-model="formUser.departments"
              :items="deptOptions"
              item-title="title"
              item-value="val"
              multiple
            ></v-select>
            <v-checkbox
              :label="lang?.activeAccount"
              v-model="formUser.active"
              hide-details
              class="mb-2"
            />
            <v-btn
              :text="editingUser ? lang?.saveChanges : lang?.createUser"
              color="green"
              class="mr-2"
              @click="saveUser"
            />
            <v-btn :text="lang?.cancel" color="red" @click="closeForm" />
          </v-col>
        </v-row>
      </template>
    </the-form>
  </section>
</template>

<script setup lang="ts">
/**
 * User management page (/manage/users, ROOT only).
 *
 * Paginated user table backed by GET /root/user/fetch, with a modal form
 * (TheForm) shared by both "create" and "edit" flows — `editingUser` being
 * null means create mode. Deletion asks for confirmation via the global
 * dialog and is blocked by the backend for ROOT users (code 202).
 */
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import TheForm from '@/assets/components/utils/TheForm.vue'
import { Permission } from '@/assets/config/auth'
import utilStore from '@/stores/utils'
import type { SelectItem } from '@/types/interface'
import { globalUtil } from '@/utils/util'
import { computed, inject, onMounted, ref } from 'vue'

// Active i18n string map, provided by the app root.
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')

/** Row shape for the user table (mirrors the backend UserDTO). */
interface User {
  id: number
  name: string
  displayName: string
  email: string
  roles: Array<{ title: string; roleId: number; userId: number; value: number }> // Permission codes (numbers, not strings)
  roleStr: string // human-readable join of the role names, for display
  active: boolean
  isEnabled: number
  realName: string
  title: string
  birthday: string
  hireDate: string
  departments: number[]
}

const users = ref<User[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const showForm = ref(false)
const editingUser = ref<User | null>(null)
const formUser = ref<User>({
  id: 0,
  name: '',
  displayName: '',
  email: '',
  roles: [],
  roleStr: 'ROOT',
  active: true,
  isEnabled: 1,
  realName: '',
  title: '',
  birthday: '',
  hireDate: '',
  departments: [],
})
const deptOptions = ref<{ val: number; title: string }[]>([])
// Build the role <v-select> options from the Permission enum. A numeric
// TS enum contains reverse mappings (value → name), so keep only the
// entries whose value is a number.
const roles = ref<SelectItem[]>([])
{
  const options: SelectItem[] = []
  for (const p in Permission) {
    const val = Permission[p]
    if (typeof val === 'number') {
      options.push({ title: p, value: val })
    }
  }
  roles.value = options
}
const currentPage = ref(1)
const pageSize = ref(5)

roles.value.sort((a, b) => a.title.localeCompare(b.title))

const apiBase = (import.meta.env.VITE_BASE_URL ?? '').replace(/\/$/, '')

const totalElements = ref(0)
// const activeCount = computed(() => users.value.filter((user) => user.active).length)
// const inactiveCount = computed(() => users.value.length - activeCount.value)
const pageCount = computed(() => Math.max(1, Math.ceil(totalElements.value / pageSize.value)))
const updatePage = async (page: number) => {
  currentPage.value = page
  await fetchUsers()
}
/** Loads one page of users. Backend pages are 0-based, the UI is 1-based. */
const fetchUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const resp = await http.get(
      `/root/user/fetch?page=${currentPage.value - 1}&size=${pageSize.value}`,
    )
    const userList: User[] = resp.data.content
    userList.forEach((e) => {
      e.roles = e.roles.map((r) => r) // ✅ ensure numbers
      e.roleStr = e.roles
        .map((p) => Permission[p.value])
        .filter(Boolean)
        .join(' ')
    })
    users.value = userList
    totalElements.value = resp.data.totalElements
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unknown error occurred'
  } finally {
    isLoading.value = false
  }
}
const fetchOptions = async () => {
  const resp = await http.get('/admin/departments/dept/options')
  deptOptions.value = resp.data.object
}

/** Opens the form in create mode with a fresh default user (ROOT role). */
const openCreate = () => {
  editingUser.value = null
  formUser.value = {
    id: 0,
    name: '',
    displayName: '',
    email: '',
    roles: [],
    roleStr: 'ROOT',
    active: true,
    isEnabled: 1,
    realName: '',
    title: '',
    birthday: '',
    hireDate: '',
    departments: [],
  }
  showForm.value = true
}
/** Opens the form in edit mode, copying the row so edits can be cancelled. */
const openEdit = (user: User) => {
  editingUser.value = user
  formUser.value = {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    roles: user.roles,
    roleStr: user.roles
      .map((p) => Permission[p.value])
      .filter(Boolean)
      .join(','),
    active: user.active,
    isEnabled: 1,
    realName: user.realName,
    title: user.title,
    birthday: user.birthday,
    hireDate: user.hireDate,
    departments: user.departments,
  }
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  errorMessage.value = ''
}

/** Creates (POST) or updates (PUT) a user depending on the form mode. */
const saveUser = async () => {
  errorMessage.value = ''
  const payload = {
    id: formUser.value.id,
    name: formUser.value.name.trim(),
    displayName: formUser.value.displayName.trim(),
    email: formUser.value.email.trim(),
    roleList: formUser.value.roles.map((ele) => ele.roleId),
    active: formUser.value.active,
    isEnabled: 1,
    realName: formUser.value.realName,
    title: formUser.value.title,
    birthday: formUser.value.birthday,
    hireDate: formUser.value.hireDate,
    departments: formUser.value.departments,
  }
  if (!payload.name || !payload.email) {
    errorMessage.value = 'Name and email are required'
    return
  }
  try {
    const url = `${apiBase}/root/users`
    const response = editingUser.value
      ? await http.put(url, payload)
      : await http.post(url, payload)

    if (!response.data) {
      throw new Error('Save failed')
    }
    await fetchUsers()
    closeForm()
  } catch (error) {
    globalUtil.activeDialog(lang?.saveFail, error, undefined, 1)
  }
}
/**
 * Deletes a user after a confirm dialog. The backend returns code 202 when
 * the target is a ROOT user, which cannot be deleted.
 */
const deleteUser = async (user: User) => {
  await globalUtil.activeDialog(lang?.deleteUser, lang?.deleteUserContent, undefined, 2)
  if (!utilStore().globalDialogValue) {
    return // user pressed cancel
  }
  try {
    const response = await http.delete(`${apiBase}/root/delete/${user.id}`)
    if (response.data.code === 202) {
      await globalUtil.activeDialog(lang?.deleteFail, lang?.cantDeleteRoot, undefined, 1)
    } else if (response.data.code != 200) {
      await globalUtil.activeDialog(lang?.deleteFail, lang?.unexpecetdError, undefined, 1)
    }
    users.value = users.value.filter((u) => u.id !== user.id)
  } catch (error) {
    globalUtil.activeDialog(lang?.deleteFail, error, undefined, 1)
  }
}

onMounted(async () => {
  await fetchUsers()
  await fetchOptions()
})
</script>
