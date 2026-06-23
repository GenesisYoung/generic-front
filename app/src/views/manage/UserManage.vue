<template>
  <section class="user-manage page-container">
    <header class="page-header">
      <div>
        <h1>{{ lang?.userManage }}</h1>
        <p>{{ lang?.userManageDescription }}</p>
      </div>
      <button class="primary-button" @click="openCreate">{{ lang?.addUser }}</button>
    </header>

    <div class="toolbar">
      <input
        v-model="searchTerm"
        type="search"
        :placeholder="lang?.searchUsers"
        class="search-input"
      />
    </div>
    <div class="table-wrapper">
      <v-table class="user-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ lang?.userName }}</th>
            <th>{{ lang?.userEmail }}</th>
            <th>{{ lang?.userRole }}</th>
            <th>{{ lang?.userStatus }}</th>
            <th class="actions-col">{{ lang?.userActions }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="center">{{ lang?.loading }}</td>
          </tr>
          <tr v-if="!isLoading && filteredUsers.length === 0">
            <td colspan="6" class="center">{{ lang?.noUserFound }}</td>
          </tr>
          <tr v-for="user in paginatedUsers" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>
              <div class="role-badges">
                <span class="role-chip">{{ user.roleStr || lang?.noRoles || 'No roles' }}</span>
              </div>
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
      <div class="table-footer">
        <div>
          {{ lang?.showing || 'Showing' }} {{ paginatedUsers.length }} {{ lang?.of || 'of' }}
          {{ filteredUsers.length }} {{ lang?.users || 'users' }}
        </div>
        <div>{{ lang?.page || 'Page' }} {{ currentPage + 1 }} / {{ pageCount }}</div>
      </div>
    </div>

    <pagination-bar
      class="mt-3"
      v-if="filteredUsers.length > 0"
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
          <label>
            {{ lang?.userName }}
            <input v-model="formUser.name" type="text" required />
          </label>
          <label>
            {{ lang?.displayName }}
            <input v-model="formUser.display_name" type="text" required />
          </label>
          <label>
            {{ lang?.userEmail }}
            <input v-model="formUser.email" type="email" required />
          </label>

          <label>
            {{ lang?.userRole }}
            <v-select
              item-value="ROOT"
              v-model="formUser.roleStr"
              :items="roles"
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
import type { SelectItem } from '@/types/interface'
import { computed, inject, onMounted, ref, watch } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')

interface User {
  id: number
  name: string
  display_name: string
  email: string
  roles: Array<string>
  roleStr: string
  active: boolean
}

const users = ref<User[]>([])
const searchTerm = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const showForm = ref(false)
const editingUser = ref<User | null>(null)
const formUser = ref<Omit<User, 'id'>>({
  name: '',
  display_name: '',
  email: '',
  roles: [],
  roleStr: 'ROOT',
  active: true,
})
const roles = ref<SelectItem[]>([])
const currentPage = ref(0)
const pageSize = ref(10)

for (const p in Permission) {
  const val = Permission[p]
  if (typeof val === 'number') {
    roles.value.push({ title: p, value: val })
  }
}

roles.value.sort((a, b) => a.title.localeCompare(b.title))

const apiBase = (import.meta.env.VITE_BASE_URL ?? '').replace(/\/$/, '')

const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const query = searchTerm.value.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.roleStr.toString().includes(query)
    )
  }),
)
// const activeCount = computed(() => users.value.filter((user) => user.active).length)
// const inactiveCount = computed(() => users.value.length - activeCount.value)
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)),
)
const paginatedUsers = computed(() => {
  const start = currentPage.value * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})
watch(filteredUsers, () => {
  if (currentPage.value > pageCount.value - 1) {
    currentPage.value = Math.max(0, pageCount.value - 1)
  }
})
const updatePage = async (page: number) => {
  currentPage.value = page
}
const fetchUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const resp = await http.get(`/root/user/fetch?page=${currentPage.value}&size=${pageSize.value}`)
    const userList: User[] = resp.data.content
    userList.forEach((e) => {
      e.roleStr = ''
      e.roles.forEach((p) => {
        if (p != undefined) e.roleStr += Permission[Number.parseInt(p)] + ' '
      })
    })
    users.value = userList
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unknown error occurred'
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  editingUser.value = null
  formUser.value = {
    name: '',
    display_name: '',
    email: '',
    roles: ['1001'],
    roleStr: 'ROOT',
    active: true,
  }
  showForm.value = true
}

const openEdit = (user: User) => {
  editingUser.value = user
  formUser.value = {
    name: user.name,
    display_name: user.display_name,
    email: user.email,
    roles: user.roles,
    roleStr: 'ROOT',
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
    name: formUser.value.name.trim(),
    display_name: formUser.value.display_name.trim(),
    email: formUser.value.email.trim(),
    roles: formUser.value.roles,
    active: formUser.value.active,
  }

  if (!payload.name || !payload.email) {
    errorMessage.value = 'Name and email are required'
    return
  }

  try {
    const url = editingUser.value ? `${apiBase}/users/${editingUser.value.id}` : `${apiBase}/users`
    const method = editingUser.value ? 'PUT' : 'POST'
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error('Save failed')
    }
    await fetchUsers()
    closeForm()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unknown error occurred'
  }
}

const deleteUser = async (user: User) => {
  const confirmed = window.confirm(`Delete user ${user.name}?`)
  if (!confirmed) {
    return
  }

  try {
    const response = await fetch(`${apiBase}/users/${user.id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Delete failed')
    }
    users.value = users.value.filter((u) => u.id !== user.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unknown error occurred'
  }
}

onMounted(fetchUsers)
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
  background: #f8fafc;
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
