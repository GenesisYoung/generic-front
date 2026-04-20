<template>
  <div class="role-manage">
    <h2>{{ lang?.roleManage }}</h2>
    <!-- 角色列表 -->
    <div class="role-list">
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
                @click="deleteRole({ key: role.name, value: role.value })"
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
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ref } from 'vue'
import PaginationBar from '@/assets/components/PaginationBar.vue'
type Lan = Record<string, string>
const lang = inject<Lan>('lan')
const roles = ref<Role[]>([])
type Role = {
  id: number
  name: string
  value: number
}

initRoles()

function initRoles() {
  roles.value = fetchRoles()
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
  //TODO: 实现编辑角色的功能
  alert(`编辑角色: ${role.key}`)
}
function deleteRole(role: { key: string; value: number }) {
  //TODO: 实现删除角色的功能
  alert(`删除角色: ${role.key}`)
}
</script>
