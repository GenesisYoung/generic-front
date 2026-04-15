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
            <th>{{ lang?.userName }}</th>
            <th>{{ lang?.userEmail }}</th>
            <th>{{ lang?.userRole }}</th>
            <th>{{ lang?.userStatus }}</th>
            <th class="actions-col">{{ lang?.userActions }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="5" class="center">{{ lang?.loading }}</td>
          </tr>
          <tr v-if="!isLoading && filteredUsers.length === 0">
            <td colspan="5" class="center">{{ lang?.noUserFound }}</td>
          </tr>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
            <td>
              <span :class="['status-pill', user.active ? 'active' : 'inactive']">
                {{ user.active ? lang?.active : lang?.disabled }}
              </span>
            </td>
            <td class="actions-col">
              <button class="ghost-button btn" @click="openEdit(user)">{{ lang?.edit }}</button>
              <button class="danger-button btn" @click="deleteUser(user)">
                {{ lang?.delete }}
              </button>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </div>

    <aside v-if="showForm" class="drawer">
      <div class="drawer-header">
        <h2>{{ editingUser ? 'Edit User' : 'Create User' }}</h2>
        <button class="icon-button" @click="closeForm">×</button>
      </div>

      <form @submit.prevent="saveUser" class="user-form">
        <label>
          Name
          <input v-model="formUser.name" type="text" required />
        </label>

        <label>
          Email
          <input v-model="formUser.email" type="email" required />
        </label>

        <label>
          Role
          <select v-model="formUser.role">
            <option v-for="role in roles" :key="role" :value="role">
              {{ role }}
            </option>
          </select>
        </label>

        <label class="checkbox-label">
          <input v-model="formUser.active" type="checkbox" />
          Active account
        </label>

        <div class="form-actions">
          <button type="button" class="ghost-button" @click="closeForm">Cancel</button>
          <button type="submit" class="primary-button">
            {{ editingUser ? 'Save Changes' : 'Create User' }}
          </button>
        </div>
      </form>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { inject } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')

interface User {
  id: number
  name: string
  email: string
  role: string
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
  email: '',
  role: 'User',
  active: true,
})

const roles = ['Admin', 'Manager', 'User']

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const query = searchTerm.value.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    )
  }),
)

const fetchUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    //TODO: 后端接口需要改成返回 200 + { code: 0, data: [...] } 的格式，目前先兼容一下
    // const response = await fetch(`${apiBase}/users`)
    // if (!response.ok) {
    //   throw new Error('Failed to load users')
    // }
    // const data = (await response.json()) as User[]
    // users.value = data
    const fakeData: User[] = [
      { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin', active: true },
      { id: 2, name: 'Bob', email: 'bob@example.com', role: 'Manager', active: true },
      { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User', active: false },
    ]
    users.value = fakeData
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
    email: '',
    role: 'User',
    active: true,
  }
  showForm.value = true
}

const openEdit = (user: User) => {
  editingUser.value = user
  formUser.value = {
    name: user.name,
    email: user.email,
    role: user.role,
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
    email: formUser.value.email.trim(),
    role: formUser.value.role,
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
  padding: 24px;
  display: grid;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}

.search-input {
  min-width: 280px;
  padding: 10px 12px;
  border-radius: 8px;
}

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
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
  font-weight: 600;
}

.actions-col {
  width: 180px;
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

.drawer {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  max-width: 540px;
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
  background: #ffffff;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
