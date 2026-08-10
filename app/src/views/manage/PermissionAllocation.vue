<script lang="ts" setup>
import { inject } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
</script>
<template>
  <div id="permissionAllocation">
    <v-tabs show-arrows>
      <v-tab to="/user/permission/allocation/user">{{ lan?.throughUser }}</v-tab>
      <v-tab to="/user/permission/allocation/permission">{{ lan?.throughPermission }}</v-tab>
      <v-tab to="/user/permission/allocation/defaults">{{ lan?.defaultPermissionAlloc }}</v-tab>
    </v-tabs>
    <router-view></router-view>
  </div>
</template>
