<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import ManagerView from './home/ManagerView.vue'
import { Permission } from '@/assets/config/auth'
const authStore = useAuthStore() // Initialize auth store to ensure it's available throughout the app
const roles = authStore.identity?.roles
console.log('User roles:', roles)
</script>

<template>
  <v-responsive class="border rounded" id="home-elements-container">
    <ManagerView v-if="roles?.includes(Permission.ROOT) || roles?.includes(Permission.SALESMAN)" />
  </v-responsive>
</template>

<style scoped></style>
