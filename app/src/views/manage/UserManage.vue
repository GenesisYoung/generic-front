<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>{{ lang?.userManage }}</h1>
        <p>{{ lang?.userManageDescription }}</p>
      </div>
      <v-btn v-if="auth.can(Perm.users.create)" color="primary" @click="openCreate">{{
        lang?.addUser
      }}</v-btn>
    </header>

    <v-alert
      v-if="errorMessage"
      class="error-alert"
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
                :model-value="user.roles.map((r) => r.value)"
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
                v-if="auth.can(Perm.users.update)"
                size="small"
                class="mr-2"
                color="indigo"
                variant="flat"
                @click="openEdit(user)"
              >
                {{ lang?.edit }}
              </v-btn>
              <v-btn
                v-if="auth.can(Perm.users.delete)"
                size="small"
                color="red"
                variant="flat"
                @click="deleteUser(user)"
              >
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
            <v-text-field
              v-if="!editingUser"
              label="初始密码"
              v-model="formUser.initialPassword"
              type="password"
              autocomplete="new-password"
              min-width="6"
              hint="至少6位字符，建议使用大小写字母、数字和符号组合"
            />
            <!-- <input type="text" hidden :value="syncRoles(formUser.roles)" /> -->
            <v-select
              :label="lang?.userRole"
              v-model="formRoles"
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
import { Perm } from '@/assets/config/auth'
import { useAuthStore } from '@/stores/auth'
import utilStore from '@/stores/utils'
import type { SelectItem } from '@/types/interface'
import { globalUtil } from '@/utils/util'
import { isAxiosError } from 'axios'
import { computed, inject, onMounted, ref } from 'vue'

// Active i18n string map, provided by the app root.
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
const auth = useAuthStore()

/** Row shape for the user table (mirrors the backend UserDTO). */
interface User {
  id: number
  name: string
  displayName: string
  email: string
  roles: Array<{ title: string; roleId: number; userId: number; value: number }> // value = role_tb.val
  roleStr: string // human-readable join of the role names, for display
  active: boolean
  isEnabled: number
  realName: string
  title: string
  birthday: string
  hireDate: string
  departments: number[]
  initialPassword?: string
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
  initialPassword: '',
})
const deptOptions = ref<{ val: number; title: string }[]>([])
// Role <v-select> options, loaded from the backend. The value is the role's
// `val` code, which is what the backend expects in `roleList`.
const roles = ref<SelectItem[]>([])
// Role codes selected in the create/edit form.
const formRoles = ref<number[]>([])
const currentPage = ref(1)
const pageSize = ref(5)

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
      e.roleStr = e.roles.map((r) => r.title).join(' ')
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
  const [deptResp, roleResp] = await Promise.all([
    http.get('/admin/departments/dept/options'),
    http.get('/admin/roles/fetch?page=0&size=20'),
  ])
  deptOptions.value = deptResp.data.object
  const roleList: Array<{ roleName: string; val: number }> = roleResp.data.content ?? []
  roles.value = roleList
    .map((r) => ({ title: r.roleName, value: r.val }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Opens the form in create mode with a fresh user and no roles. */
const openCreate = () => {
  editingUser.value = null
  formRoles.value = []
  formUser.value = {
    id: 0,
    name: '',
    displayName: '',
    email: '',
    roles: [],
    roleStr: '',
    active: true,
    isEnabled: 1,
    realName: '',
    title: '',
    birthday: '',
    hireDate: '',
    departments: [],
    initialPassword: '',
  }
  showForm.value = true
}
/** Opens the form in edit mode, copying the row so edits can be cancelled. */
const openEdit = (user: User) => {
  editingUser.value = user
  formRoles.value = user.roles.map((r) => r.value)
  formUser.value = {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    roles: user.roles,
    roleStr: user.roles.map((r) => r.title).join(','),
    active: user.active,
    isEnabled: 1,
    realName: user.realName,
    title: user.title,
    birthday: user.birthday,
    hireDate: user.hireDate,
    departments: user.departments,
    initialPassword: '',
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
    roleList: formRoles.value,
    active: formUser.value.active,
    isEnabled: 1,
    realName: formUser.value.realName,
    title: formUser.value.title,
    birthday: formUser.value.birthday,
    hireDate: formUser.value.hireDate,
    departments: formUser.value.departments,
    initialPassword: editingUser.value ? undefined : formUser.value.initialPassword,
  }
  if (!payload.name || !payload.email) {
    errorMessage.value = '姓名和邮箱不能为空'
    return
  }
  if (!editingUser.value && !payload.initialPassword) {
    errorMessage.value = '初始密码是必需的'
    return
  }
  try {
    const url = `${apiBase}/root/users`
    const response = editingUser.value
      ? await http.put(url, payload)
      : await http.post(url, payload)
    // Refusals (e.g. assigning a role you may not grant) come back as HTTP 200
    // with a non-200 code in the body.
    if (response.data.code !== undefined && response.data.code !== 200) {
      globalUtil.activeDialog(lang?.saveFail, response.data.message, undefined, 1)
      return
    }
    await fetchUsers()
    closeForm()
  } catch (error) {
    // console.error('Save failed:', error)
    // Non-2xx responses (e.g. 400 validation errors) carry the reason in the body.
    const message = isAxiosError(error)
      ? (error.response?.data?.message ?? error.message)
      : String(error)
    globalUtil.activeDialog(lang?.saveFail, message, undefined, 1)
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
      return
    } else if (response.data.code != 200) {
      await globalUtil.activeDialog(
        lang?.deleteFail,
        response.data.message ?? lang?.unexpecetdError,
        undefined,
        1,
      )
      return
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

<style scoped>
.error-alert {
  z-index: 1000000;
  opacity: 1;
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
