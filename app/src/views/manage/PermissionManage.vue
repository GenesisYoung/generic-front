<template>
  <div id="permission-manage">
    <v-tabs show-arrows>
      <v-tab v-if="auth.can(Perm.permissions.read)" to="/permission/management/permissions">{{ lan?.permissionList }}</v-tab>
      <v-tab v-if="auth.can(Perm.menus.read)" to="/permission/management/menus">{{ lan?.menuList }}</v-tab>
      <!-- <v-tab to="/permission/management/actions">{{ lan?.actionList }}</v-tab> -->
    </v-tabs>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { Perm } from '@/assets/config/auth'
import { useAuthStore } from '@/stores/auth'
import { inject } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
const auth = useAuthStore()
</script>
