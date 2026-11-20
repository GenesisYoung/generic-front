<script lang="ts" setup>
import { Perm } from '@/assets/config/auth'
import { useAuthStore } from '@/stores/auth'
import { inject } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
const auth = useAuthStore()
</script>
<template>
  <div id="permissionAllocation">
    <v-tabs show-arrows>
      <v-tab v-if="auth.can(Perm.permissions.read)" to="/user/permission/allocation/user">{{
        lan?.throughUser
      }}</v-tab>
      <v-tab v-if="auth.can(Perm.permissions.read)" to="/user/permission/allocation/permission">{{
        lan?.throughPermission
      }}</v-tab>
      <v-tab v-if="auth.can(Perm.roles.read)" to="/user/permission/allocation/defaults">{{
        lan?.roleList
      }}</v-tab>
    </v-tabs>
    <router-view></router-view>
  </div>
</template>
