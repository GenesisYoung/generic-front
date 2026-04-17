<template>
  <div class="role-manage">
    <h2>{{ lang?.roleManage }}</h2>
    <p>{{ lang?.roleManageDescription }}</p>
    <!-- 角色列表 -->
    <div class="role-list">
      <h3>{{ lang?.existingRoles }}</h3>
      <v-table> </v-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
type Lan = Record<string, string>
const lang = inject<Lan>('lan')
type Role = {
  id: number
  name: string
  value: number
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
