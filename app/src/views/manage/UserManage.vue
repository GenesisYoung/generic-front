<template>
  <section class="user-manage page-container">
    <header class="page-header">
      <div>
        <h1>{{ lang?.userManage }}</h1>
        <p>{{ lang?.userManageDescription }}</p>
      </div>
      <button class="primary-button" @click="openCreate">{{ lang?.addUser }}</button>
    </header>

    <div class="table-wrapper">
      <v-table class="user-table">
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 10%">{{ lang?.userName }}</th>
            <th style="width: 15% !important">{{ lang?.userEmail }}</th>
            <th style="width: 10%">{{ lang?.displayName }}</th>
            <th style="width: 20%">{{ lang?.userRole }}</th>
            <th style="width: 10%">{{ lang?.userStatus }}</th>
            <th style="width: 20%" class="actions-col">{{ lang?.userActions }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="center">{{ lang?.loading }}</td>
          </tr>
          <tr v-if="!isLoading && users.length === 0">
            <td colspan="6" class="center">{{ lang?.noUserFound }}</td>
          </tr>
          <tr v-for="user in users" :key="user.id">
            <td :title="user.id.toString()">{{ user.id }}</td>
            <td :title="user.name">{{ user.name }}</td>
            <td :title="user.email">{{ user.email }}</td>
            <td :title="user.displayName">{{ user.displayName }}</td>
            <td>
              <v-select
                v-model="user.roles"
                :items="roles"
                item-title="title"
                item-value="value"
                multiple
                disabled
              ></v-select>
            </td>
            <td>
              <span :class="['status-pill', user.active ? 'active' : 'inactive']">
                {{ user.active ? lang?.active : lang?.disabled }}
              </span>
            </td>
            <td class="actions-col">
              <v-btn class="mr-2" color="indigo" variant="flat" @click="openEdit(user)">
                {{ lang?.edit }}
              </v-btn>
              <v-btn class="mr-2" color="red" variant="flat" @click="deleteUser(user)">
                {{ lang?.delete }}
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
      <!-- <div class="table-footer">
        <div>
          {{ lang?.showing || 'Showing' }} {{ users.length }} {{ lang?.of || 'of' }}
          {{ totalElements }} {{ lang?.users || 'users' }}
        </div>
        <div>{{ lang?.page || 'Page' }} {{ currentPage + 1 }} / {{ pageCount }}</div>
      </div> -->
    </div>

    <pagination-bar
      class="mt-3"
      v-if="users.length > 0"
      :current-page="currentPage"
      :total-pages="pageCount"
      @update:currentPage="updatePage"
    ></pagination-bar>

    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </div>

    <div v-if="showForm" class="drawer-backdrop">
      <aside class="drawer">
        <div class="drawer-header">
          <h2>{{ editingUser ? 'Edit User' : 'Create User' }}</h2>
          <v-btn class="icon-button" @click="closeForm">×</v-btn>
        </div>

        <form @submit.prevent="saveUser" class="user-form">
          <input type="hidden" name="id" v-model="formUser.id" />
          <label>
            {{ lang?.userName }}
            <input v-model="formUser.name" type="text" required />
          </label>
          <label>
            {{ lang?.displayName }}
            <input v-model="formUser.displayName" type="text" required />
          </label>
          <label>
            {{ lang?.userEmail }}
            <input v-model="formUser.email" type="email" required />
          </label>

          <label>
            {{ lang?.userRole }}
            <v-select
              v-model="formUser.roles"
              :items="roles"
              item-title="title"
              item-value="value"
              multiple
            ></v-select>
          </label>

          <label class="checkbox-label active-checkbox-container">
            <div class="label">{{ lang?.activeAccount }}</div>
            <div class="check-box"><input v-model="formUser.active" type="checkbox" /></div>
          </label>

          <div class="form-actions">
            <button type="button" class="ghost-button" @click="closeForm">
              {{ lang?.cancel }}
            </button>
            <button type="submit" class="primary-button">
              {{ editingUser ? lang?.saveChanges : lang?.createUser }}
            </button>
          </div>
        </form>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import http from '@/api/http'
import PaginationBar from '@/assets/components/PaginationBar.vue'
import { Permission } from '@/assets/config/auth'
import utilStore from '@/stores/utils'
import type { SelectItem } from '@/types/interface'
import { globalUtil } from '@/utils/util'
import { computed, inject, onMounted, ref } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')

interface User {
  id: number
  name: string
  displayName: string
  email: string
  roles: Array<number> // ✅ number, not string
  roleStr: string
  active: boolean
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
})
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
const fetchUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const resp = await http.get(
      `/root/user/fetch?page=${currentPage.value - 1}&size=${pageSize.value}`,
    )
    const userList: User[] = resp.data.content
    userList.forEach((e) => {
      e.roles = e.roles.map((r) => Number(r)) // ✅ ensure numbers
      e.roleStr = e.roles
        .map((p) => Permission[p])
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

const openCreate = () => {
  editingUser.value = null
  formUser.value = {
    id: 0,
    name: '',
    displayName: '',
    email: '',
    roles: [1001],
    roleStr: 'ROOT',
    active: true,
  }
  showForm.value = true
}
const openEdit = (user: User) => {
  editingUser.value = user
  formUser.value = {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    roles: [...user.roles], // already numbers
    roleStr: user.roles
      .map((p) => Permission[p])
      .filter(Boolean)
      .join(','),
    active: user.active,
  }
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  errorMessage.value = ''
}

const saveUser = async () => {
  errorMessage.value = ''
  const payload = {
    id: formUser.value.id,
    name: formUser.value.name.trim(),
    displayName: formUser.value.displayName.trim(),
    email: formUser.value.email.trim(),
    roles: formUser.value.roles,
    active: formUser.value.active,
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
    errorMessage.value = error instanceof Error ? error.message : 'An unknown error occurred'
  }
}
const deleteUser = async (user: User) => {
  await globalUtil.activeDialog(lang?.deleteUser, lang?.deleteUserContent, undefined, 2)
  if (!utilStore().globalDialogValue) {
    return
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
    errorMessage.value = error instanceof Error ? error.message : 'An unknown error occurred'
  }
}

onMounted(async () => {
  await fetchUsers()
})
</script>

<style scoped>
@import '@/assets/styles/main.css';
.page-container {
  position: relative;
  padding: 24px;
  display: grid;
  gap: 24px;
  max-width: 1180px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}

.search-input {
  min-width: 280px;
  max-width: 360px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

.summary-card-title {
  color: #6b7280;
  font-size: 0.95rem;
}

.summary-card strong {
  font-size: 1.4rem;
}

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
  table-layout: fixed;
}

.user-table td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap; /* Rule 2: stop the text from wrapping/expanding */
}

.user-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.user-table :deep(td) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 0; /* helps fixed layout honor the % strictly */
}

.user-table th,
.user-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.user-table th {
  background: #14406c;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.user-table tbody tr:hover {
  background: #065f46;
}

.actions-col {
  width: 180px;
}

.role-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-chip {
  display: inline-flex;
  align-items: center;
  background: #e0f2fe;
  color: #0369a1;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
}

.center {
  text-align: center;
  padding: 24px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
}

.status-pill.active {
  background: #d1fae5;
  color: #065f46;
}

.status-pill.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  color: #4b5563;
  font-size: 0.95rem;
}

.primary-button,
.ghost-button,
.danger-button,
.icon-button {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.primary-button {
  background: #3b62b7;
  color: #fff;
  padding: 10px 16px;
}

.ghost-button {
  background: #f3f4f6;
  color: #111827;
  padding: 10px 14px;
}

.danger-button {
  background: #ef4444;
  color: #fff;
  padding: 10px 14px;
}

.icon-button {
  background: transparent;
  color: #111827;
  font-size: 1.4rem;
  line-height: 1;
  padding: 4px 8px;
}

.error-banner {
  padding: 14px 16px;
  border-radius: 12px;
  background: #fee2e2;
  color: #b91c1c;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 20;
}

.drawer {
  background: #fff;
  border: 1px solid #e5e7eb;
  max-height: min(90vh, 650px);
  overflow-y: auto;
  border-radius: 18px;
  padding: 28px;
  width: min(520px, 100%);
  position: relative;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
}

@media screen and (max-width: 680px) {
  .drawer {
    width: 100%;
    padding: 20px;
  }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.user-form {
  display: grid;
  gap: 16px;
}

.user-form label {
  display: grid;
  gap: 8px;
  font-weight: 600;
  color: #111827;
}

.user-form input[type='text'],
.user-form input[type='email'],
.user-form select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.active-checkbox-container input[type='checkbox'] {
  height: 100%;
}
.active-checkbox-container {
  display: flex !important;
  justify-content: flex-start;
  align-items: center;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
