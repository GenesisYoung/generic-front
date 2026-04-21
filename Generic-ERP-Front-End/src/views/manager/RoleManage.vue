<template>
  <div class="role-manage">
    <h2>{{ lang?.roleManage }}</h2>
    <!-- 角色列表 -->
    <div class="role-list">
      <v-row class="justify-end mb-3">
        <v-btn color="primary" @click="showForm = true">{{ lang?.add }}</v-btn>
      </v-row>
      <v-table striped="even">
        <thead>
          <tr>
            <th>{{ lang?.roleId }}</th>
            <th>{{ lang?.roleName }}</th>
            <th>{{ lang?.roleValue }}</th>
            <th>{{ lang?.actions }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in roles" :key="role.id">
            <td>{{ role.id }}</td>
            <td>{{ role.name }}</td>
            <td>{{ role.value }}</td>
            <td>
              <v-btn
                color="indigo"
                class="mr-2"
                density="comfortable"
                variant="flat"
                @click="editRole({ key: role.name, value: role.value })"
              >
                {{ lang?.edit }}
              </v-btn>
              <v-btn
                color="red"
                class="mr-2"
                density="comfortable"
                variant="flat"
                @click="deleteRole({ id: role.id })"
              >
                {{ lang?.delete }}
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
      <pagination-bar
        class="mt-3"
        :current-page="1"
        :total-pages="Math.ceil(roles.length / 10)"
      ></pagination-bar>
    </div>
    <div v-if="showForm" class="table-wrapper rounded-lg bg-grey-darken-4 pa-5">
      <v-form class="mb-4">
        <v-row class="flex justify-end">
          <v-btn class="icon-button text-display-small" variant="plain" @click="closeForm">×</v-btn>
        </v-row>
        <v-row>
          <v-text-field
            v-model="roleForm.name"
            label="角色名称"
            variant="filled"
            density="comfortable"
          ></v-text-field>
        </v-row>
        <v-row>
          <v-text-field
            v-model="roleForm.value"
            label="角色值"
            variant="filled"
            density="comfortable"
          ></v-text-field>
        </v-row>
        <v-row class="justify-center">
          <v-btn color="primary" @click="saveRole(roleForm.id)">
            {{ isEditMode ? lang?.save : lang?.add }}
          </v-btn>
        </v-row>
      </v-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ref } from 'vue'
import PaginationBar from '@/assets/components/PaginationBar.vue'
type Lan = Record<string, string>
const lang = inject<Lan>('lan')
const roles = ref<Role[]>([])
const roleForm = ref({
  id: 0 as number,
  name: '' as string,
  value: 0 as number,
})
const showForm = ref(false)
type Role = {
  id: number
  name: string
  value: number
}
const isEditMode = ref(false)

initRoles()

function saveRole(id: number) {
  if (isEditMode.value) {
    // TODO: 实现保存角色的功能
    alert(`保存角色:${id} ${roleForm.value.name} (${roleForm.value.value})`)
  } else {
    // TODO: 实现添加角色的功能
  }
}

function initRoles() {
  roles.value = fetchRoles()
}
function closeForm() {
  showForm.value = false
  isEditMode.value = false
  roleForm.value.name = ''
  roleForm.value.value = 0
}
function fetchRoles(): Role[] {
  //TODO: 实现获取角色列表的功能
  return [
    { id: 1, name: '管理员', value: 1 },
    { id: 2, name: '编辑', value: 2 },
    { id: 3, name: '查看者', value: 3 },
  ]
}
function editRole(role: { key: string; value: number }) {
  isEditMode.value = true
  showForm.value = true
  roleForm.value.name = role.key
  roleForm.value.value = role.value
  //TODO: 实现编辑角色的功能
}
function deleteRole(role: { id: number }) {
  //TODO: 实现删除角色的功能
  alert(`删除角色: ${role.id}`)
}
</script>

<style scoped>
.role-manage {
  position: relative;
}
.table-wrapper {
  position: absolute;
  top: 10%;
  left: 20%;
  width: 60%;
  max-height: 450px;
}
.closeForm {
  font-size: 24px;
  cursor: pointer;
}
</style>
