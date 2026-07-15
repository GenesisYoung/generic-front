<template>
  <div id="permission-manage">
    <v-tabs>
      <v-tab to="/permission/management/permissions">{{ lan?.permissionList }}</v-tab>
      <v-tab to="/permission/management/menus">{{ lan?.menuList }}</v-tab>
      <v-tab to="/permission/management/actions">{{ lan?.actionList }}</v-tab>
    </v-tabs>
    <v-container>
      <router-view />
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'

type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
</script>
