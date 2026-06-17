<template>
  <div class="role-manage">
    <h2>{{ lang?.roleManage }}</h2>
    <v-breadcrumbs>
      <v-breadcrumbs-item
        v-for="item in roleManageMenu"
        :key="item.text"
        :title="item.text"
        :disabled="item.disabled"
        :href="item.href"
      />
    </v-breadcrumbs>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue'
type Lan = Record<string, string>
const lang = inject<Lan>('lan')
const roleManageMenu = ref([
  { text: lang?.roleList || '角色列表', disabled: false, href: '/manage/roles/list' },
  { text: lang?.roleDistribute || '角色分配', disabled: false, href: '/manage/roles/distribute' },
])
</script>

<style scoped>
.role-manage {
  position: relative;
}
</style>
